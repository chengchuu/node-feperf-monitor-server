'use strict';

const https = require('https');

module.exports = function requestLogger(options, app) {
  return async function requestLoggerMiddleware(ctx, next) {
    try {
      await next();
    } finally {

      const ignorePaths = [
        '/feperf/ping',
        '/server/log/add',
      ];

      if (ignorePaths.indexOf(ctx.path) !== -1) {
        return;
      }

      const content = 'Feperf ' + ctx.method + ' ' + ctx.path;

      console.log('[request_logger] ' + content);

      const body = JSON.stringify({
        log_type: 'request',
        content,
      });

      const req = https.request({
        hostname: 'i.mazey.net',
        path: '/server/log/add',
        method: 'POST',
        timeout: 3000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      });

      req.on('response', function(res) {
        res.resume();
      });

      req.on('timeout', function() {
        req.destroy();
      });

      req.on('error', function(e) {
        console.log(
          '[request_logger] failed: ' + e.message
        );
      });

      req.write(body);
      req.end();
    }
  };
};
