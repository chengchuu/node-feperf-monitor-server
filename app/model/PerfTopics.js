"use strict";

module.exports = app => {
  const { STRING, INTEGER, FLOAT } = app.Sequelize;

  const PerfTopics = app.model.define("PerfTopics", {
    topic_id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    topic: {
      type: STRING(12),
    },
    project_name: { // 项目名称
      type: STRING(12),
    },
    project_description: { // 项目描述
      type: STRING(200),
    },
    owner: { // 项目负责人
      type: STRING(12),
    },
    department: { // 部门
      type: STRING(50),
    },
    contact: { // 部门
      type: STRING(50),
    },
    switch: { // 开关 1 开 0 关
      type: INTEGER,
      defaultValue: 1,
    },
    user_name: { // 系统所属用户名字，也常用作公司名称
      type: STRING(20),
      defaultValue: "",
    },
  }, {
    tableName: "perf_topics",
    createdAt: "created_at",
    updatedAt: false,
  });

  PerfTopics.sync();

  return PerfTopics;
};
