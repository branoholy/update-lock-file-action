"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isFileChanged = void 0;

var _child_process = require("child_process");

const isFileChanged = path => {
  return (0, _child_process.execSync)(`git diff --shortstat ${path} | wc -l`).toString().trim() === '1';
};

exports.isFileChanged = isFileChanged;