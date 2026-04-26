'use strict';

const Subscription = require('egg').Subscription;
const axios = require('axios');
const { deepCopyObject } = require('mazey');
class Robot extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 15 10 * * *',
      type: 'worker',
    };
  }
  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    // 获取 topics
    const topics = (await this.ctx.service.perf.getTopic()).map(v => v.topic);
    // console.log('topics', topics);
    // topics.reduce(async (last, topic) => {
    //   await last;
    //   return axios
    //     .post('https://mazey.cn/server/robot/feperf', { perfDays: deepCopyObject(await this.ctx.service.perf.queryPerfStatistics({ topic, limit: 30 })) })
    //     .catch(console.error);
    // }, undefined);
  }
}

module.exports = Robot;
