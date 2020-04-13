import envalid from 'envalid';

import { main } from './main';
import { getInput } from './utils/action-utils';

try {
  const requiredEnv = envalid.cleanEnv(process.env, {
    GITHUB_REPOSITORY: envalid.str()
  });

  main({
    repository: requiredEnv.GITHUB_REPOSITORY,
    token: getInput('token', { required: true }),
    branch: getInput('branch'),
    commitMessage: getInput('commit-message'),
    commitToken: getInput('commit-token'),
    title: getInput('title'),
    body: getInput('body'),
    labels: getInput('labels'),
    assignees: getInput('assignees'),
    reviewers: getInput('reviewers'),
    teamReviewers: getInput('team-reviewers'),
    milestone: getInput('milestone'),
    draft: getInput('draft')
  }).then((code) => process.exit(code));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
