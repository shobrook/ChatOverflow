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
const AUTH_ERROR_MESSAGE = `<p>Please login and pass Cloudflare check at <a href="https://chat.openai.com" target="_blank">chat.openai.com</a></p>`;
const CLOUDFLARE_ERROR_MESSAGE = `<p>Please pass the Cloudflare check at <a href="https://chat.openai.com" target="_blank">chat.openai.com</a></p>`;
const cache = new ExpiryMap(10 * 1000);

/*********
 * HELPERS
 *********/

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

    console.log(error);

    let errorMessage;
    if (!isEmpty(error)) {
      if ("detail" in error) {
        if (typeof error.detail === "object" && "message" in error.detail) {
          errorMessage = `<p style="color: red">${error.detail.message}</p>`;
        } else {
          errorMessage = `<p style="color: red">${error.detail}</p>`;
        }
      } else {
        errorMessage = `<p style="color: red">An unknown error occurred.</p>`;
      }
    } else {
      errorMessage = `<p style="color: red">Error: ${resp.status} ${resp.statusText}</p>`;
    }

    throw new Error(errorMessage);
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
    body: JSON.stringify(propertyObject)
  });
}

async function getAccessToken() {
  if (cache.get(KEY_ACCESS_TOKEN)) {
    return cache.get(KEY_ACCESS_TOKEN)
  }

  const resp = await fetch(CHATGPT_URL);
  if (resp.status === 403) {
    throw new Error(CLOUDFLARE_ERROR_MESSAGE);
  }

  const data = await resp.json().catch(() => ({}))
  if (!data.accessToken) {
    throw new Error(AUTH_ERROR_MESSAGE);
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
      parent_message_id: uuidv4()
    }),
    onMessage(message) {
      if (message === "[DONE]") { // ChatGPT output is done streaming
        deleteConversation();
        return;
      }

      let data;
      try { // Sometimes a non-JSON payload is returned by ChatGPT
        data = JSON.parse(message);
      } catch (err) {
        return;
      }

      const text = data.message?.content?.parts?.[0];
      conversationId = data.conversation_id;

      if (text) {
        console.log("Sent: CHATGPT_OUTPUT");

        port.postMessage({
          key: "CHATGPT_OUTPUT",
          value: {
            text,
            messageId: data.message.id,
            conversationId: data.conversation_id
          }
        });
      }
    },
  });
}

async function sendMessageFeedback(data) {
  const accessToken = await getAccessToken();
  fetch(`${CHATGPT_API_URL}/conversation/message_feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
}

/*****************
 * EVENT LISTENERS
 *****************/

chrome.runtime.onConnect.addListener(port => {
  console.assert(port.name === "main-port");

  port.onMessage.addListener(async message => {
    const { key, value } = message;

    console.log(`Received: ${key}`);

    try {
      if (key === "SCRAPED_QUESTION") {
        await generateAnswer(port, value);
      } else if (key === "FEEDBACK") {
        await sendMessageFeedback(value);
      }
    } catch (err) {
      port.postMessage({ key: "ERROR", value: err.message });
      cache.delete(KEY_ACCESS_TOKEN);
    }
  });
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  const { key, value } = request;

  try {
    if (key === "CHECK_ACCESS") {
      await getAccessToken();
      sendResponse({ key: "ACCESS_CONFIRMED", value: true });
    }
  } catch (err) {
    sendResponse({ key: "ERROR", value: err.message });
    cache.delete(KEY_ACCESS_TOKEN);
  }
});
