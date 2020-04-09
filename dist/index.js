"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.main = void 0;

const main = _args => {
  console.log('Hello World!');
  return 0;
};

exports.main = main;
process.exit(main(process.argv.slice(2)));