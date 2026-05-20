const path = require("path");

module.exports = {
  entry: "./deploy.js",
  mode: "production",
  output: {
    filename: "deploy.bin.js",
    path: path.resolve(__dirname, "./"),
  },
  target: "node",
  node: {
    dgram: "empty",
    child_process: "empty",
    fs: "empty",
  },
};

// npm i child_process dns fs net -D
