'use strict';

const https = require('https');

module.exports = function requestLogger(options, app) {
  return async function requestLoggerMiddleware(ctx, next) {
    await next();

    const content = 'Feperf ' + ctx.method + ' ' + ctx.path;
    const body = JSON.stringify({
      log_type: 'request',
      content: content,
    });

    const req = https.request({
      hostname: 'i.mazey.net',
      path: '/server/log/add',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    });

    req.on('error', function(e) {
      app.logger.warn('[request_logger] failed to send log: ' + e.message);
    });

    req.write(body);
    req.end();
    app.logger.info('[request_logger] ' + content);
  };
};
