/***********
 * CONSTANTS
 ***********/

import mixpanel from "mixpanel-browser";
import hljs from "highlight.js";

const CODE_BLOCK_IDENTIFIER = "```";
const INLINE_CODE_IDENTIFIER = "`";
const port = chrome.runtime.connect({ name: "main-port" });

mixpanel.init("086b13692ef1441185a5f7e238c620c6", { debug: true });

/***********
 * HELPERS *
 ***********/

const deleteElementById = elementId => {
  const element = document.getElementById(elementId);
  if (element) {
    element.outerHTML = "";
  }
}

const getQuestionElement = () => {
  const questionElement = document.getElementById("question");
  const questionBody = questionElement.getElementsByClassName("js-post-body")[0];

  return questionBody;
}

const getQuestionId = () => {
  const questionElement = document.getElementById("question");
  return questionElement.getAttribute("data-questionid");
}

const convertPostToText = postElement => {
  const postText = Array.from(postElement.children).map(child => {
    if (child.tagName === "P") {
      const paragraphText = Array.from(child.childNodes).map(node => {
        const nodeText = node.textContent;
        return node.nodeName === "CODE" ? `\`${nodeText}\`` : nodeText;
      });
      return paragraphText.join("");
    } else if (child.tagName === "PRE") {
      return `${CODE_BLOCK_IDENTIFIER}\n${child.textContent}\n${CODE_BLOCK_IDENTIFIER}`;
    }
  });

  return postText.join("\n");
}

const stylizeAnswerElement = answerElement => {
  answerElement.style.border = "1px solid #e4e5e8";
  answerElement.style.borderRadius = "var(--br-md)";
  answerElement.style.backgroundColor = "#f6f6f6";
}

const stylizeBodyElement = bodyElement => {
  bodyElement.style.paddingLeft = "15px";
}

const stylizeLHSElement = (lhsElement) => {
  lhsElement.style.display = "flex";
  lhsElement.style.flexDirection = "column";
  lhsElement.style.alignItems = "center";
}

const stylizeRHSElement = (rhsElement, isError) => {
  if (isError) {
    rhsElement.style.display = "flex";
    rhsElement.style.alignItems = "center";
  }
}

const stylizeAnswerCount = plusOneElement => {
  plusOneElement.style.color = "rgb(16, 163, 127)";
  plusOneElement.style.fontWeight = "600";
}

const stylizeChatGPTIcon = (iconElement, isError) => {
  iconElement.style.backgroundColor = isError ? "hsl(358deg 68% 59%)" : "rgb(16, 163, 127)";
  iconElement.style.paddingLeft = "5px";
  iconElement.style.paddingRight = "5px";
  iconElement.style.paddingBottom = "0px";
  iconElement.style.paddingTop = "0px";
  iconElement.style.borderRadius = "5px";
  iconElement.style.display = "block";
  iconElement.style.width = "36px";
  iconElement.style.height = "36px";
  iconElement.style.color = "white";
}

const stylizeFeedbackIcon = iconSVG => {
  iconSVG.style.fill = "#6a737c";
  iconSVG.style.marginTop = "10px";
  iconSVG.style.cursor = "pointer";
}

const createChatGPTIcon = (parentElement, isError) => {
  parentElement.innerHTML = `<svg width="41" height="41" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z" fill="currentColor"></path></svg>
  `;

  const svg = parentElement.querySelector("svg");
  stylizeChatGPTIcon(svg, isError)
}

const createAnswerElement = isError => {
  const answerElement = document.createElement("div");
  const bodyElement = document.createElement("div");
  const lhsElement = document.createElement("div");
  const rhsElement = document.createElement("div");
  const textElement = document.createElement("div");

  answerElement.className = "answer js-answer";
  answerElement.id = isError ? "chatGPTError" : "chatGPTAnswer";
  bodyElement.className = "post-layout";
  lhsElement.className = "votecell post-layout--left";
  lhsElement.id = "chatGPTOptions";
  rhsElement.className = "answercell post-layout--right";
  textElement.className = "s-prose js-post-body";
  textElement.id = isError ? "chatGPTErrorText" : "chatGPTAnswerText";

  // stylizeAnswerElement(answerElement);
  stylizeBodyElement(bodyElement);
  stylizeLHSElement(lhsElement);
  stylizeRHSElement(rhsElement, isError);
  createChatGPTIcon(lhsElement, isError);

  answerElement.appendChild(bodyElement);
  bodyElement.appendChild(lhsElement);
  bodyElement.appendChild(rhsElement);
  rhsElement.appendChild(textElement);

  return answerElement;
}

const populateAnswerText = chatGPTOutput => {
  const textElement = document.getElementById("chatGPTAnswerText")
  textElement.innerHTML = "";

  chatGPTOutput.split(CODE_BLOCK_IDENTIFIER).forEach((textBlock, index) => {
    if (index % 2) { // Code block
      const preElement = document.createElement("pre");
      preElement.className = "default s-code-block";
      // preElement.style.backgroundColor = "#e3e5e6";

      const codeElement = document.createElement("code");
      const highlightedCode = hljs.highlightAuto(textBlock.trim());
      codeElement.className = `hljs language-${highlightedCode.language}`;
      codeElement.className = "hljs language-python";
      codeElement.innerHTML = highlightedCode.value;

      preElement.appendChild(codeElement);
      textElement.appendChild(preElement);
    } else {
      const pElement = document.createElement("p");

      textBlock.split(INLINE_CODE_IDENTIFIER).forEach((subTextBlock, subIndex) => {
        if (subIndex % 2) { // In-line code
          pElement.innerHTML += `<code>${subTextBlock}</code>`;
        } else {
          pElement.innerHTML += subTextBlock;
        }
      });

      textElement.appendChild(pElement);
    }
  });
}

const populateNonAnswerText = (isError, text) => {
  const textElement = document.getElementById(isError ? "chatGPTErrorText" : "chatGPTAnswerText");
  textElement.innerHTML = text;
}

const incrementAnswerCount = () => {
  const answersHeader = document.getElementById("answers-header");
  const answerCountContainer = answersHeader.querySelector("h2");
  const numAnswers = answerCountContainer.getAttribute("data-answercount");

  const newAnswerTitle = `${numAnswers} <span>+1</span> Answers`;
  answerCountContainer.innerHTML = newAnswerTitle;

  const plusOne = answerCountContainer.querySelector("span");
  stylizeAnswerCount(plusOne);
};

const insertElement = (elementId, createElement) => {
  deleteElementById("chatGPTError");
  deleteElementById("chatGPTAnswer");

  let element = document.getElementById(elementId);
  if (!element) {
    const answersContainer = document.getElementById("answers");
    const firstAnswer = document.getElementsByClassName("answer")[0]

    element = createElement();

    if (!firstAnswer) {
      const answersHeader = document.getElementById("answers-header");
      answersContainer.insertBefore(element, answersHeader.nextSibling);
    } else {
      answersContainer.insertBefore(element, firstAnswer);
    }
  }
}

const insertFeedbackIcons = (messageId, conversationId) => {
  const questionId = getQuestionId();
  const optionsSidebar = document.getElementById("chatGPTOptions");

  const thumbsUpWrapper = document.createElement("div");
  thumbsUpWrapper.innerHTML = `<svg aria-hidden="true" focusable="false" role="img" class="octicon octicon-thumbsup" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style="display: inline-block; user-select: none; vertical-align: text-bottom; overflow: visible;"><path fill-rule="evenodd" d="M8.834.066C7.494-.087 6.5 1.048 6.5 2.25v.5c0 1.329-.647 2.124-1.318 2.614-.328.24-.66.403-.918.508A1.75 1.75 0 002.75 5h-1A1.75 1.75 0 000 6.75v7.5C0 15.216.784 16 1.75 16h1a1.75 1.75 0 001.662-1.201c.525.075 1.067.229 1.725.415.152.043.31.088.475.133 1.154.32 2.54.653 4.388.653 1.706 0 2.97-.153 3.722-1.14.353-.463.537-1.042.668-1.672.118-.56.208-1.243.313-2.033l.04-.306c.25-1.869.265-3.318-.188-4.316a2.418 2.418 0 00-1.137-1.2C13.924 5.085 13.353 5 12.75 5h-1.422l.015-.113c.07-.518.157-1.17.157-1.637 0-.922-.151-1.719-.656-2.3-.51-.589-1.247-.797-2.01-.884zM4.5 13.3c.705.088 1.39.284 2.072.478l.441.125c1.096.305 2.334.598 3.987.598 1.794 0 2.28-.223 2.528-.549.147-.193.276-.505.394-1.07.105-.502.188-1.124.295-1.93l.04-.3c.25-1.882.189-2.933-.068-3.497a.922.922 0 00-.442-.48c-.208-.104-.52-.174-.997-.174H11c-.686 0-1.295-.577-1.206-1.336.023-.192.05-.39.076-.586.065-.488.13-.97.13-1.328 0-.809-.144-1.15-.288-1.316-.137-.158-.402-.304-1.048-.378C8.357 1.521 8 1.793 8 2.25v.5c0 1.922-.978 3.128-1.933 3.825a5.861 5.861 0 01-1.567.81V13.3zM2.75 6.5a.25.25 0 01.25.25v7.5a.25.25 0 01-.25.25h-1a.25.25 0 01-.25-.25v-7.5a.25.25 0 01.25-.25h1z"></path></svg>`;
  const thumbsUpSVG = thumbsUpWrapper.firstChild;

  const thumbsDownWrapper = document.createElement("div");
  thumbsDownWrapper.innerHTML = `<svg aria-hidden="true" focusable="false" role="img" class="octicon octicon-thumbsdown" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style="display: inline-block; user-select: none; vertical-align: text-bottom; overflow: visible;"><path fill-rule="evenodd" d="M7.083 15.986c1.34.153 2.334-.982 2.334-2.183v-.5c0-1.329.646-2.123 1.317-2.614.329-.24.66-.403.919-.508a1.75 1.75 0 001.514.872h1a1.75 1.75 0 001.75-1.75v-7.5a1.75 1.75 0 00-1.75-1.75h-1a1.75 1.75 0 00-1.662 1.2c-.525-.074-1.068-.228-1.726-.415L9.305.705C8.151.385 6.765.053 4.917.053c-1.706 0-2.97.152-3.722 1.139-.353.463-.537 1.042-.669 1.672C.41 3.424.32 4.108.214 4.897l-.04.306c-.25 1.869-.266 3.318.188 4.316.244.537.622.943 1.136 1.2.495.248 1.066.334 1.669.334h1.422l-.015.112c-.07.518-.157 1.17-.157 1.638 0 .921.151 1.718.655 2.299.512.589 1.248.797 2.011.884zm4.334-13.232c-.706-.089-1.39-.284-2.072-.479a63.914 63.914 0 00-.441-.125c-1.096-.304-2.335-.597-3.987-.597-1.794 0-2.28.222-2.529.548-.147.193-.275.505-.393 1.07-.105.502-.188 1.124-.295 1.93l-.04.3c-.25 1.882-.19 2.933.067 3.497a.921.921 0 00.443.48c.208.104.52.175.997.175h1.75c.685 0 1.295.577 1.205 1.335-.022.192-.049.39-.075.586-.066.488-.13.97-.13 1.329 0 .808.144 1.15.288 1.316.137.157.401.303 1.048.377.307.035.664-.237.664-.693v-.5c0-1.922.978-3.127 1.932-3.825a5.862 5.862 0 011.568-.809V2.754zm1.75 6.798a.25.25 0 01-.25-.25v-7.5a.25.25 0 01.25-.25h1a.25.25 0 01.25.25v7.5a.25.25 0 01-.25.25h-1z"></path></svg>`;
  const thumbsDownSVG = thumbsDownWrapper.firstChild;

  stylizeFeedbackIcon(thumbsUpSVG);
  stylizeFeedbackIcon(thumbsDownSVG);

  optionsSidebar.appendChild(thumbsUpSVG);
  optionsSidebar.appendChild(thumbsDownSVG);

  thumbsUpSVG.onclick = async event => {
    thumbsUpSVG.style.fill = "rgb(16, 163, 127)";
    thumbsDownSVG.style.fill = "#6a737c";

    port.postMessage({
      key: "FEEDBACK",
      value: {
        messageId,
        conversationId,
        questionId,
        rating: "thumbsUp",
      }
    });

    mixpanel.track("ChatGPT Feedback", { questionId, rating: "thumbsUp" });
  }
  thumbsDownSVG.onclick = async event => {
    thumbsUpSVG.style.fill = "#6a737c";
    thumbsDownSVG.style.fill = "hsl(358deg 68% 59%)";

    port.postMessage({
      key: "FEEDBACK",
      value: {
        messageId,
        conversationId,
        questionId,
        rating: "thumbsDown",
      }
    });

    mixpanel.track("ChatGPT Feedback", { questionId, rating: "thumbsDown" });
  }
}

/**************
 * DOM PAYLOADS
 **************/

const scrapeQuestion = () => {
  const questionElement = getQuestionElement();
  const questionText = convertPostToText(questionElement);
  const questionId = getQuestionId();

  port.postMessage({
    key: "SCRAPED_QUESTION",
    value: {
      questionText,
      questionId
    }
  });

  console.log("Sent: SCRAPED_QUESTION");

  mixpanel.track("ChatGPT Response", { questionId });
}

const insertAnswer = chatGPTOutput => {
  const isError = false;
  const { text, messageId, conversationId } = chatGPTOutput;

  insertElement("chatGPTAnswer", () => {
    incrementAnswerCount();
    return createAnswerElement(isError);
  });
  populateAnswerText(text);
  insertFeedbackIcons(messageId, conversationId);
}

const insertError = errorMessage => {
  const isError = true;

  insertElement("chatGPTError", () => createAnswerElement(isError));
  populateNonAnswerText(isError, errorMessage);
}

/*****************
 * EVENT LISTENERS
 *****************/

port.onMessage.addListener(message => {
  const { key, value } = message;

  console.log(`Received: ${key}`);

  if (key === "CHATGPT_OUTPUT") {
    insertAnswer(value);
  } else if (key === "ERROR") {
    insertError(value);
  }
});

window.onload = () => {
  const isError = false;

  insertElement("chatGPTAnswer", () => createAnswerElement(isError));
  populateNonAnswerText(isError, "Waiting for ChatGPT response...")
  scrapeQuestion();
}
