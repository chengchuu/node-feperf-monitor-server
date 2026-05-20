"use strict";

const Subscription = require("egg").Subscription;
// todo 每小时统计当天 2:20 统计 0:00 ~ 2:20 / 每半小时统计前一小时 2:20/2:50 统计 1:00 ~ 2:00
class ReportPerf extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: 30 * 60 * 1000, // 单位 ms
      type: "worker", // 指定所有的 worker 都需要执行
    };
  }
  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    // 获取 topics
    const topics = (await this.ctx.service.perf.getTopic()).map(v => v.topic);
    topics.reduce(async (last, topic) => {
      await last;
      return this.ctx.service.perf.mGetPerf({ topic, dreamDay: new Date() });
    }, undefined);
  }
}

module.exports = ReportPerf;
