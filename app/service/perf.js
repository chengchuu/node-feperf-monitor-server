"use strict";

const Service = require("egg").Service;
const { format, addDays } = require("date-fns");
const { err } = require("../entities/err");
const { rsp } = require("../entities/response/index");

class PerfService extends Service {
  async addTopic({ topic, project_name, project_description, owner, department, contact, userName = "" } = {}) {
    const { ctx } = this;

    const exist = await ctx.model.PerfTopics.findOne({
      where: {
        topic,
      },
    });

    if (exist) {
      return err({
        info: "err_topic_existed",
      });
    }

    const rRes = await ctx.model.PerfTopics.create({
      topic,
      project_name,
      project_description,
      owner,
      department,
      contact,
      user_name: userName,
    });

    return rsp({ data: { rRes } });
  }

  async getTopic({ userName = "" } = {}) {
    const { ctx } = this;
    const where = {
      switch: 1,
    };
    if (userName) {
      Object.assign(where, { user_name: userName });
    }
    return ctx.model.PerfTopics.findAll({
      attributes: [ "topic_id", "topic", "project_name" ],
      where,
      order: [
        [ "topic_id" ],
      ],
    });
  }

  async savePerfStatistics({
    topic,
    dns_time_avg,
    tcp_time_avg,
    response_time_avg,
    white_time_avg,
    domready_time_avg,
    onload_time_avg,
    render_time_avg,
    report_rate_avg,
    report_count,
    report_day,
    report_hour,
    ss_status,
  }) {
    const { ctx } = this;

    await ctx.model.PerfStatistics.update({
      ss_status: 0,
    }, {
      where: {
        topic,
        report_day,
      },
    });

    return ctx.model.PerfStatistics.create({
      topic,
      dns_time_avg,
      tcp_time_avg,
      response_time_avg,
      white_time_avg,
      domready_time_avg,
      onload_time_avg,
      render_time_avg,
      report_rate_avg,
      report_count,
      report_day,
      report_hour,
      ss_status,
    });
  }

  async queryPerfStatistics({ topic, limit }) {
    const { ctx } = this;

    return ctx.model.PerfStatistics.findAll({
      where: {
        topic,
        ss_status: 1,
      },
      limit: Number(limit),
      order: [
        [ "created_at", "DESC" ],
      ],
    });
  }

  async getPerf({ topic = 0, startDay, endDay }) {
    const { ctx } = this;

    return ctx.model.query(`
      SELECT
        round( AVG( dns_time ), 2 ) AS dns_time_avg,-- dns
        round( AVG( tcp_time ), 2 ) AS tcp_time_avg,-- tcp
        round( AVG( response_time ), 2 ) AS response_time_avg,-- 服务器响应时间
        round( AVG( white_time ), 2 ) AS white_time_avg,-- 白屏时间
        round( AVG( domready_time ), 2 ) AS domready_time_avg,-- domready
        round( AVG( onload_time ), 2 ) AS onload_time_avg,-- 加载时间
        round( AVG( render_time ), 2 ) AS render_time_avg,-- 页面总时间
        round( AVG( report_rate ), 2 ) AS report_rate_avg,-- 平均取样率
        COUNT( 1 ) AS report_count 
      FROM
        perf_report_log 
      WHERE
        1 = 1 
        AND topic = '${topic}'
        AND dns_time IS NOT NULL 
        AND tcp_time IS NOT NULL 
        AND response_time IS NOT NULL 
        AND white_time IS NOT NULL 
        AND domready_time IS NOT NULL 
        AND onload_time IS NOT NULL 
        AND onload_time > 0 
        AND onload_time < 30000 
        AND render_time IS NOT NULL
        AND created_at >= '${startDay}'
        AND created_at < '${endDay}'
    `);
    // AND created_at >= DATE_SUB('${startDay}', INTERVAL 8 HOUR )
    //     AND created_at < DATE_SUB('${endDay}', INTERVAL 8 HOUR )
  }

  async getCount() {
    const { ctx } = this;

    return ctx.model.PerfReportLog.count();
  }

  async mGetPerf({ topic, dreamDay }) {
    const d = new Date(dreamDay);
    const reportDay = format(d, "yyyy-MM-dd"); // `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const reportHour = format(d, "HH"); // `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const startDay = format(new Date(dreamDay), "yyyy-MM-dd 00:00:00");
    // console.log('startDay', startDay);
    const endDay = format(addDays(new Date(startDay), 1), "yyyy-MM-dd 00:00:00");
    // console.log('endDay', endDay);
    const [ results ] = await this.getPerf({ topic, startDay, endDay });
    if (results.length && results[0].report_count) {
      const ss = Object.assign(results[0], {
        report_day: reportDay,
        report_hour: reportHour,
        topic,
        ss_status: 1,
      });
      return this.savePerfStatistics(ss);
    }
    return true;
  }
}

module.exports = PerfService;

