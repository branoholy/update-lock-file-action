import envalid from 'envalid';

import { main } from './main';

const requiredEnv = envalid.cleanEnv(process.env, {
  GITHUB_REPOSITORY: envalid.str(),
  GITHUB_TOKEN: envalid.str()
});

const [owner, repository] = requiredEnv.GITHUB_REPOSITORY.split('/');

main({
  owner,
  repository,
  branchName: process.env.BRANCH_NAME,
  commitMessage: process.env.COMMIT_MESSAGE,
  commitToken: requiredEnv.GITHUB_TOKEN,
  pullRequestTitle: process.env.PULL_REQUEST_TITLE,
  pullRequestBody: process.env.PULL_REQUEST_BODY,
  pullRequestToken: process.env.PULL_REQUEST_TOKEN
}).then((code) => process.exit(code));
