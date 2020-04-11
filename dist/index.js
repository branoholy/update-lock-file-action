"use strict";

var _envalid = _interopRequireDefault(require("envalid"));

var _main = require("./main");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const requiredEnv = _envalid.default.cleanEnv(process.env, {
  GITHUB_REPOSITORY: _envalid.default.str(),
  GITHUB_TOKEN: _envalid.default.str()
});

const [owner, repository] = requiredEnv.GITHUB_REPOSITORY.split('/');
(0, _main.main)({
  owner,
  repository,
  branchName: process.env.BRANCH_NAME,
  commitMessage: process.env.COMMIT_MESSAGE,
  commitToken: requiredEnv.GITHUB_TOKEN,
  pullRequestTitle: process.env.PULL_REQUEST_TITLE,
  pullRequestBody: process.env.PULL_REQUEST_BODY,
  pullRequestToken: process.env.PULL_REQUEST_TOKEN
}).then(code => process.exit(code));