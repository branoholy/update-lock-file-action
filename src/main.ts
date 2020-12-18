import envalid from 'envalid';

import { app, CommitArgs, PullRequestArgs } from './app';
import { ActionUtils } from './utils/action-utils';

const getCommitArgs = () => {
  const commitArgs: CommitArgs = {
    message: ActionUtils.getInputAsString('commit.message'),
    amend: ActionUtils.getInputAsBoolean('commit.amend')
  };

  return commitArgs;
};

const getPullRequestArgs = () => {
  const pullRequest = ActionUtils.getInputAsBoolean('pull-request') ?? true;

  if (!pullRequest) {
    return undefined;
  }

  const pullRequestArgs: PullRequestArgs = {
    title: ActionUtils.getInputAsString('pull-request.title'),
    body: ActionUtils.getInputAsString('pull-request.body'),
    labels: ActionUtils.getInputAsStrings('pull-request.labels'),
    assignees: ActionUtils.getInputAsStrings('pull-request.assignees'),
    reviewers: ActionUtils.getInputAsStrings('pull-request.reviewers'),
    teamReviewers: ActionUtils.getInputAsStrings('pull-request.team-reviewers'),
    milestone: ActionUtils.getInputAsInteger('pull-request.milestone'),
    draft: ActionUtils.getInputAsBoolean('pull-request.draft')
  };

  return pullRequestArgs;
};

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
      deleteBranch: ActionUtils.getInputAsBoolean('delete-branch'),
      commit: getCommitArgs(),
      pullRequest: getPullRequestArgs()
    });

    process.exit(exitCode);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};
