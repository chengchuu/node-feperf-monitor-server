"use strict";

module.exports = app => {
  const { INTEGER, FLOAT, STRING } = app.Sequelize;

  const PerfStatistics = app.model.define("PerfStatistics", {
    ss_id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    topic: {
      type: STRING(12),
    },
    dns_time_avg: {
      type: FLOAT,
    },
    tcp_time_avg: {
      type: FLOAT,
    },
    response_time_avg: {
      type: FLOAT,
    },
    white_time_avg: {
      type: FLOAT,
    },
    domready_time_avg: {
      type: FLOAT,
    },
    onload_time_avg: {
      type: FLOAT,
    },
    report_rate_avg: {
      type: FLOAT,
    },
    report_count: {
      type: INTEGER,
    },
    report_day: {
      type: STRING(12),
    },
    report_hour: {
      type: STRING(12),
    },
    ss_status: {
      type: INTEGER, // 1 可用 0 过期
    },
  }, {
    tableName: "perf_statistics",
    createdAt: "created_at",
    updatedAt: false,
  });

  PerfStatistics.sync();

  return PerfStatistics;
};
