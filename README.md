# ChatGPT for StackOverflow

A browser extension that displays ChatGPT's response alongside community answers to StackOverflow questions.

![Demo](demo.gif)

## Installation

You can install the extension [for Chrome](https://chrome.google.com/webstore/detail/chatgpt-for-stackoverflow/apjhekoaogdimcgiihoncakocdddhmlk) or [for Firefox.](https://addons.mozilla.org/en-US/firefox/addon/chatgpt-for-stackoverflow/)

## Running Locally

1. Clone the repository
2. Install dependencies with `$ npm install`
3. Build the extension with `$ npm run build`
4. Upload the `build` directory to Chrome
5. For Firefox, use `manifest.v2.json` and change all in-code references to `chrome` to `browser`
