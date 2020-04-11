"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDependencyManager = void 0;

var _fs = require("fs");

const dependencyManagers = [{
  name: 'npm',
  lockFilePath: 'package-lock.json',
  installCommand: 'npm i'
}, {
  name: 'yarn',
  lockFilePath: 'yarn.lock',
  installCommand: 'yarn'
}];

const getDependencyManager = () => {
  for (const dependencyManager of dependencyManagers) {
    if ((0, _fs.existsSync)(dependencyManager.lockFilePath)) {
      return dependencyManager;
    }
  }

  return null;
};

exports.getDependencyManager = getDependencyManager;