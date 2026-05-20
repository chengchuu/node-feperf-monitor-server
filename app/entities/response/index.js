"use strict";

// 格式化返回字段
function rsp({ ctx, ret = 0, info = "ok", message, data } = {}) {
  const rspBody = {
    ret,
    info,
    message,
    data,
  };
  if (ctx) ctx.body = rspBody;
  return rspBody;
}

module.exports = {
  rsp,
};
