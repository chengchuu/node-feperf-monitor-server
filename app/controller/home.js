"use strict";

const Controller = require("egg").Controller;
const { rsp } = require("../entities/response/index");

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = rsp({ message: "success" });
  }
  async testPost() {
    const { ctx } = this;
    const rules = { id: "string" };
    ctx.validate(rules, ctx.request.body);
    ctx.body = "hi";
  }
}

module.exports = HomeController;
