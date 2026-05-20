"use strict";

const errCodeMessageMap = require("./errCodeMessageMap");

// 错误返回格式
function err({ ctx, ret = 413, info = "err_server_error", message = "" } = {}) {
  message = parseErrInfo({ info, message });
  const rspBody = {
    ret,
    info,
    message,
  };
  if (ctx) ctx.body = rspBody;
  return rspBody;
}

// 解析错误码
function parseErrInfo({ info, message }) {
  // info = info.toLowerCase();
  if (errCodeMessageMap.has(info)) {
    message = errCodeMessageMap.get(info);
  }
  return message;
}

module.exports = {
  err,
};
