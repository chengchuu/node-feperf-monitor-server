"use strict";

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  const errorHandler = app.middleware.errorHandler();
  // Ping
  router.get("/feperf/ping", errorHandler, controller.home.index);
  // Report
  router.get("/feperf/report", errorHandler, controller.report.perf);
  router.get("/feperf/report/get-topics", errorHandler, controller.report.cGetTopics);
  // SDK
  router.get("/feperf/sdk/loader", errorHandler, controller.report.cLoadPerf);
  // Statistic
  router.get("/feperf/monitor/perf/day", controller.monitor.perfDay);
  router.get("/feperf/monitor/run/perf-month", controller.monitor.runPerfMonth);
  router.post("/feperf/monitor/add/topic", controller.monitor.addTopic);
  router.get("/feperf/monitor/get/topic", controller.monitor.getTopic);
  router.get("/feperf/monitor/get/count", controller.monitor.getCount);
  router.get("/feperf/monitor/get/history", controller.monitor.getHistory);
};
