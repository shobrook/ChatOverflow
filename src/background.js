import ExpiryMap from "expiry-map";
import { v4 as uuidv4 } from "uuid";
import { createParser } from "eventsource-parser";
import { isEmpty } from "lodash-es";

/***********
 * CONSTANTS
 ***********/

const CHATGPT_URL = "https://chat.openai.com/api/auth/session";
const CHATGPT_API_URL = "https://chat.openai.com/backend-api";
const STACKOVERFLOW_BASE_URL = "stackoverflow.com/questions/";
const KEY_ACCESS_TOKEN = "accessToken";
const cache = new ExpiryMap(10 * 1000);

/*********
 * HELPERS
 *********/

function isStackOverflowQuestion(url) {
  if (!url.includes(STACKOVERFLOW_BASE_URL)) {
    return false;
  }

  const urlComponents = url.split("/");
  const indexOfBase = urlComponents.indexOf("questions");
  if (indexOfBase !== -1 && urlComponents.length - 1 > indexOfBase) {
    return true;
  }

  return false;
}

async function* streamAsyncIterable(stream) {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }

      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

async function fetchSSE(resource, options) {
  const { onMessage, ...fetchOptions } = options;
  const resp = await fetch(resource, fetchOptions);

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(!isEmpty(error) ? JSON.stringify(error) : `${resp.status} ${resp.statusText}`);
  }

  const parser = createParser(event => {
    if (event.type === "event") {
      onMessage(event.data);
    }
  });

  for await (const chunk of streamAsyncIterable(resp.body)) {
    const str = new TextDecoder().decode(chunk);
    parser.feed(str);
  }
}

async function setConversationProperty(token, conversationId, propertyObject) {
  return fetch(`${CHATGPT_API_URL}/conversation/${conversationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(propertyObject),
    // mode: "no-cors"
  });
}

async function getAccessToken() {
  if (cache.get(KEY_ACCESS_TOKEN)) {
    return cache.get(KEY_ACCESS_TOKEN)
  }

  // const resp = await fetch(CHATGPT_URL, { mode: "no-cors" });
  const resp = await fetch(CHATGPT_URL);
  console.log(resp);
  if (resp.status === 403) {
    throw new Error("CLOUDFLARE");
  }

  const data = await resp.json().catch(() => ({}))
  if (!data.accessToken) {
    throw new Error("UNAUTHORIZED");
  }

  cache.set(KEY_ACCESS_TOKEN, data.accessToken);

  return data.accessToken;
}

async function generateAnswer(port, question) {
  const accessToken = await getAccessToken();

  let conversationId;
  const deleteConversation = () => {
    if (conversationId) {
      setConversationProperty(accessToken, conversationId, { is_visible: false });
    }
  }

  const controller = new AbortController();
  port.onDisconnect.addListener(() => {
    controller.abort();
    deleteConversation();
  });

  await fetchSSE(`${CHATGPT_API_URL}/conversation`, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: "next",
      messages: [
        {
          id: uuidv4(),
          role: "user",
          content: {
            content_type: "text",
            parts: [question],
          },
        },
      ],
      model: "text-davinci-002-render",
      parent_message_id: uuidv4(),
      // mode: "no-cors"
    }),
    onMessage(message) {
      console.log(message);

      if (message === "[DONE]") { // ChatGPT output is done streaming
        port.postMessage({ event: "DONE" });
        deleteConversation();

        return;
      }

      const data = JSON.parse(message);
      const text = data.message?.content?.parts?.[0];
      conversationId = data.conversation_id;

      if (text) {
        port.postMessage({
          key: "CHATGPT_OUTPUT",
          value: text,
          // messageId: data.message.id,
          // conversationId: data.conversation_id,
        });
      }
    },
  });
}

/*****************
 * EVENT LISTENERS
 *****************/

chrome.runtime.onConnect.addListener(port => {
  console.assert(port.name === "main-port");

  port.onMessage.addListener(async message => {
    const { key, value } = message;

    if (key === "SCRAPED_QUESTION") {
      try {
        console.log("Received question"); // TEMP

        await generateAnswer(port, value);
      } catch (err) {
        console.error(err);
        port.postMessage({ error: err.message });
        cache.delete(KEY_ACCESS_TOKEN);
      }
    }
  });
});
