// (() => {
//   chrome.runtime.sendMessage({ key: "CHECK_ACCESS" }, response => {
//     const { key, value } = response;
//
//     console.log(`Received: ${key}`);
//
//     if (key === "ACCESS_CONFIRMED") {
//       const prompt = document.getElementById("prompt");
//       prompt.textContent = "You're logged into ChatGPT and ready to start using ChatOverflow.";
//     } else if (key === "ERROR") {
//       const promptContainer = document.getElementById("promptContainer");
//       promptContainer.innerHTML = value;
//     }
//   });
//
//   console.log("Sent: CHECK_ACCESS");
// })();
