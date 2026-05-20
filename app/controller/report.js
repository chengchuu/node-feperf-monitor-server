"use strict";

const { rsp } = require("../entities/response/index");
const { err } = require("../entities/err");
const Controller = require("egg").Controller;
const { inRate } = require("mazey");
const { format, addDays } = require("date-fns");

class ReportController extends Controller {
  async perf() {
    const { ctx } = this;
    // const topic = ctx.query.topic;
    // if (!topics.has(topic)) return err({ ctx });
    // const topicId = topics.get(topic);
    const saveResult = await ctx.model.PerfReportLog.create(ctx.query);
    if (!saveResult) return err({ ctx });
    ctx.body = rsp();
  }
  async cGetTopics() {
    const { ctx } = this;
    ctx.body = rsp({ data: {
      topicsCache: ctx.app.topicsCache,
    } });
  }
  // 加载 sdk
  async cLoadPerf() {
    const { ctx } = this;
    // console.log('ctx.query', ctx.query)
    let { topic, rate } = ctx.query;
    rate = Number(rate);
    const rateResult = inRate(rate);
    const data = {
      topic,
      rate,
      rateResult,
    };
    // console.log('cLoadPerf data', data)
    // ctx.body = rsp({ data });
    if (rateResult) {
      const n = format(new Date(), "yyyy-MM-dd");
      const topicsCache = ctx.app.topicsCache || [];
      const thatTopic = topicsCache.find(v => v.topic === topic);
      if (thatTopic) thatTopic[n] += 1;
      ctx.redirect("https://i.mazey.net/feperf/sdk/prd/report.js");
    } else {
      ctx.append("content-type", "application/javascript");
      // ctx.append('access-control-allow-origin', '*');
      ctx.body = `console.log(${JSON.stringify(data)});`;
    }
  }
}

module.exports = ReportController;
