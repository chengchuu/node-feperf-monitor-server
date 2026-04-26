'use strict';

const Subscription = require('egg').Subscription;
const { format, addDays } = require('date-fns');
const { deepCopyObject } = require('mazey');
// const { delete } = require('../entities/errCodeMessageMap');

class GetTopics extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: 30 * 60 * 1000, // 30 分钟间隔
      type: 'all', // 指定所有的 worker 都需要执行
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const query = {
      attributes: [ 'topic_id', 'topic', 'project_name' ],
      where: {
        switch: 1,
      },
      order: [
        [ 'topic_id' ],
      ],
    };
    const n = format(new Date(), 'yyyy-MM-dd');
    // 现存 topics
    const topicsData = await this.ctx.model.PerfTopics.findAll(query);
    const existTopics = topicsData.map(v => v.topic);
    // console.log('GetTopics existTopics', existTopics)
    // 缓存 topics
    const cacheTopicsData = this.ctx.app.topicsCache || [];
    // console.log('GetTopics cacheTopics', cacheTopicsData)
    // 过滤后 topics
    // const topics = deepCopyObject(topicsData);
    // console.log('GetTopics topics', topics)
    const topics = [];
    existTopics.forEach(topic => {
      const usedKeys = [ topic, n ];
      let existTopic = cacheTopicsData.find(v => v.topic === topic);
      if (!existTopic) {
        existTopic = {
          topic,
          [n]: 0,
        };
      }
      // 为 topic 补充今日 count
      if (!existTopic[n]) existTopic[n] = 0;
      // todo 移除过去(昨日)日期的 count
      // const keys = Object.keys(existTopic)
      // keys.forEach(key => {
      //   if (!usedKeys.includes(key)) {
      //     delete existTopic[key]
      //   }
      // })
      topics.push(existTopic);
    });
    // console.log('GetTopics topics after', topics)
    this.ctx.app.topicsCache = topics;
  }
}

module.exports = GetTopics;
