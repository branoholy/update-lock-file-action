import envalid from 'envalid';

import { main } from './main';
import { getInput } from './utils/action-utils';

const requiredEnv = envalid.cleanEnv(process.env, {
  GITHUB_REPOSITORY: envalid.str()
});

const [owner, repository] = requiredEnv.GITHUB_REPOSITORY.split('/');

main({
  owner,
  repository,
  branchName: getInput('branch-name'),
  commitMessage: getInput('commit-message'),
  commitToken: getInput('github-token', { required: true }),
  pullRequestTitle: getInput('pull-request-title'),
  pullRequestBody: getInput('pull-request-body'),
  pullRequestToken: getInput('pull-request-token')
}).then((code) => process.exit(code));
