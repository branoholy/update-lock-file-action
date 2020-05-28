import envalid from 'envalid';

import { app } from './app';
import { getInput } from './utils/action-utils';

export const main = async () => {
  try {
    const requiredEnv = envalid.cleanEnv(process.env, {
      GITHUB_REPOSITORY: envalid.str()
    });

    const exitCode = await app({
      repository: requiredEnv.GITHUB_REPOSITORY,
      token: getInput('token', { required: true }),
      commands: getInput('commands', { required: true }),
      paths: getInput('paths', { required: true }),
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
    });

    process.exit(exitCode);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};
