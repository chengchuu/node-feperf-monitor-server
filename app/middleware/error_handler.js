"use strict";

module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      await next();
    } catch (err) {
      // 所有的异常都在 app 上触发一个 error 事件，框架会记录一条错误日志
      ctx.app.emit("error", err, ctx);

      const status = err.status || 500;
      // 生产环境时 500 错误的详细错误内容不返回给客户端，因为可能包含敏感信息
      const error = status === 500 && ctx.app.config.env === "prod"
        ? "Internal Server Error"
        : err.message;

      // 从 error 对象上读出各个属性，设置到响应中
      let info = "";
      let message = error;
      if (status === 422) {
        if (Array.isArray(err.errors) && err.errors.length) {
          ([ { message: info = "" } ] = err.errors);
          const [ { field = "" } ] = err.errors;
          message = `${message}: ${info}`;
          info = info.replace(/\s/g, "_");
          info = `${field}_${info}`;
        }
      }
      if (status !== 500) {
        ctx.status = 200;
      } else {
        ctx.status = status;
      }
      // 规范化
      const ret = status;
      ctx.body = {
        ret,
        info,
        message,
        ...ctx.body,
      };
    }
  };
};
