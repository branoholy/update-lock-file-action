import env from 'env-var';

import { main } from './main';
import { getInput, hasInput } from './utils/action-utils';

try {
  const repository = env.get('GITHUB_REPOSITORY').required().asString();
  const token = getInput('token', {
    default: env.get('GITHUB_TOKEN').required(!hasInput('token')).asString()
  });

  main({
    repository,
    token,
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
