"use strict";

// 检查手机格式
function checkPhone(phone) {
  return /^1[3456789]\d{9}$/.test(phone);
}

module.exports = {
  checkPhone,
};
