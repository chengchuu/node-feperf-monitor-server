"use strict";

const { format, addDays } = require("date-fns");
const { rsp } = require("../entities/response/index");

const Controller = require("egg").Controller;

class Monitor extends Controller {
  // 获取统计数据
  async perfDay() {
    const { ctx } = this;
    const { limit, topic } = ctx.query;
    ctx.body = rsp({
      data: {
        perfDays: await ctx.service.perf.queryPerfStatistics({ topic, limit }),
      },
    });
  }
  // 获取对应的历史数据
  async getHistory() {
    const { ctx } = this;
    ctx.body = await ctx.service.perf.getPerf(ctx.query);
  }
  // 跑数据
  async runPerfMonth() {
    const { ctx } = this;
    const { start, duration, topic } = ctx.query;
    new Array(Number(duration)).fill(0).reduce(async (last, _, index) => {
      await last;
      const tempD = format(addDays(new Date(start), index), "yyyy-MM-dd 00:00:00");
      // console.log('tempD', tempD);
      return await ctx.service.perf.mGetPerf({ topic, dreamDay: tempD });
    }, undefined);
    ctx.body = rsp();
  }
  // 添加 topic
  async addTopic() {
    const { ctx } = this;
    const mR = await ctx.service.perf.addTopic(ctx.request.body);
    ctx.body = mR;
  }
  // 获取 topic
  async getTopic() {
    const { ctx } = this;
    const { userName } = ctx.query;
    const topics = await ctx.service.perf.getTopic({ userName });
    ctx.body = rsp({ data: { topics } });
  }
  // 获取计数
  async getCount() {
    const { ctx } = this;
    const count = await ctx.service.perf.getCount();
    // console.log('count', count)
    ctx.body = rsp({ data: { count } });
  }
  // 获取缓存
  async getCache() {
    const { ctx } = this;
    // const count = await getCount();
    ctx.body = rsp();
  }
}

module.exports = Monitor;
