"use strict";

// todo 分库分表
module.exports = app => {
  const { STRING, INTEGER, FLOAT } = app.Sequelize;

  const PerfReportLog = app.model.define("PerfReportLog", {
    perf_id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    topic: {
      type: STRING(12),
    },
    os: {
      type: STRING(12),
    },
    os_version: {
      type: STRING(12),
    },
    device_type: {
      type: STRING(12),
    },
    network: {
      type: STRING(12),
    },
    screen_direction: {
      type: STRING(12),
    },
    unload_time: {
      type: INTEGER,
    },
    redirect_time: {
      type: INTEGER,
    },
    dns_time: {
      type: INTEGER,
    },
    tcp_time: {
      type: INTEGER,
    },
    ssl_time: {
      type: INTEGER,
    },
    response_time: {
      type: INTEGER,
    },
    download_time: {
      type: INTEGER,
    },
    first_paint_time: {
      type: INTEGER,
    },
    first_contentful_paint_time: {
      type: INTEGER,
    },
    domready_time: {
      type: INTEGER,
    },
    onload_time: {
      type: INTEGER,
    },
    white_time: {
      type: INTEGER,
    },
    render_time: {
      type: INTEGER,
    },
    decoded_body_size: {
      type: INTEGER,
    },
    encoded_body_size: {
      type: INTEGER,
    },
    report_rate: {
      type: FLOAT,
    },
  }, {
    tableName: "perf_report_log",
    createdAt: "created_at",
    updatedAt: false,
  });

  PerfReportLog.sync();

  return PerfReportLog;
};
