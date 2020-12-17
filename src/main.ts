import envalid from 'envalid';

import { app } from './app';
import { ActionUtils } from './utils/action-utils';

export const main = async () => {
  try {
    const requiredEnv = envalid.cleanEnv(process.env, {
      GITHUB_REPOSITORY: envalid.str()
    });

    const exitCode = await app({
      repository: requiredEnv.GITHUB_REPOSITORY,
      token: ActionUtils.getInputAsString('token', { required: true }),
      commands: ActionUtils.getInputAsStrings('commands', { required: true }),
      paths: ActionUtils.getInputAsStrings('paths', { required: true }),
      branch: ActionUtils.getInputAsString('branch'),
      commitMessage: ActionUtils.getInputAsString('commit-message'),
      commitToken: ActionUtils.getInputAsString('commit-token'),
      title: ActionUtils.getInputAsString('title'),
      body: ActionUtils.getInputAsString('body'),
      labels: ActionUtils.getInputAsStrings('labels'),
      assignees: ActionUtils.getInputAsStrings('assignees'),
      reviewers: ActionUtils.getInputAsStrings('reviewers'),
      teamReviewers: ActionUtils.getInputAsStrings('team-reviewers'),
      milestone: ActionUtils.getInputAsInteger('milestone'),
      draft: ActionUtils.getInputAsBoolean('draft')
    });

    process.exit(exitCode);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};
