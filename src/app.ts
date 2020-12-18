import * as ActionsCore from '@actions/core';
import { execSync } from 'child_process';

import { RepoKit } from './repo-kit';
import { FileUtils } from './utils/file-utils';

const branchRefPrefix = 'refs/heads/';

const runCommands = (commands: string[]) => {
  commands.forEach((command) => {
    execSync(command);
  });
};

const findChangedFiles = (paths: string[]) => {
  const changedPaths = paths.reduce<string[]>((acc, path) => {
    if (FileUtils.isFileChanged(path)) {
      console.info(`File "${path}" is changed`);
      acc.push(path);
    }

    return acc;
  }, []);

  if (changedPaths.length === 0) {
    console.info('No file has been changed');
  }

  return changedPaths;
};

const createBranch = async (repoKit: RepoKit, branch: string, deleteBranch: boolean) => {
  // Delete the branch
  if (await repoKit.hasBranch(branch)) {
    console.info(`Branch "${branch}" already exists`);

    if (deleteBranch) {
      // Delete the branch if it exists and the 'delete-branch' option is set
      console.info(`Deleting branch "${branch}"...`);
      await repoKit.deleteBranch(branch);
      console.info(`Branch "${branch}" has been deleted`);
    } else {
      // Keep the original branch if it exists and the 'delete-branch' option is not set
      return;
    }
  }

  // Create the branch
  const {
    object: { sha: defaultBranchSha }
  } = await repoKit.getDefaultBranch();

  await repoKit.createBranch(branch, defaultBranchSha);
  console.info(`Branch "${branch}" has been created`);
};

const commitChangedFiles = async (repoKit: RepoKit, paths: string[], branch: string, commitArgs: CommitArgs) => {
  const commit = await repoKit.commitFiles({
    ...commitArgs,
    paths,
    branch
  });

  ActionsCore.setOutput('commit.sha', commit.sha);
  console.info(`Changed files have been committed to ${commit.sha}`);
};

const createPullRequest = async (repoKit: RepoKit, branch: string, pullRequestArgs: PullRequestArgs) => {
  const pullRequest = await repoKit.createPullRequest({
    ...pullRequestArgs,
    branch,
    baseBranch: await repoKit.getDefaultBranchName()
  });

  console.info(`Pull request has been created at ${pullRequest.html_url}`);
};

export interface CommitArgs {
  readonly message?: string;
  readonly amend?: boolean;
}

export interface PullRequestArgs {
  readonly title?: string;
  readonly body?: string;
  readonly labels?: string[];
  readonly assignees?: string[];
  readonly reviewers?: string[];
  readonly teamReviewers?: string[];
  readonly milestone?: number;
  readonly draft?: boolean;
}

export interface AppArgs {
  readonly repository: string;
  readonly token: string;
  readonly commands: string[];
  readonly paths: string[];
  readonly branch?: string;
  readonly deleteBranch?: boolean;
  readonly commit: CommitArgs;
  readonly pullRequest?: PullRequestArgs;
}

export const app = async ({
  repository,
  token,
  commands,
  paths,
  branch = 'update-files',
  deleteBranch = false,
  commit,
  pullRequest
}: AppArgs) => {
  try {
    const [owner, repositoryName] = repository.split('/');
    if (!owner || !repositoryName) {
      throw new Error(`Repository "${repository}" does not have the valid format (owner/repositoryName)`);
    }

    if (!commit.message && !commit.amend) {
      throw new Error('Commit message is missing, please specify the "commit.message" input');
    }

    if (branch.startsWith(branchRefPrefix)) {
      branch = branch.substr(branchRefPrefix.length);
    }

    runCommands(commands);

    const changedPaths = findChangedFiles(paths);
    if (changedPaths.length === 0) {
      return 0;
    }

    const repoKit = new RepoKit(owner, repositoryName, token);

    await createBranch(repoKit, branch, deleteBranch);
    await commitChangedFiles(repoKit, changedPaths, branch, commit);

    if (pullRequest) {
      await createPullRequest(repoKit, branch, pullRequest);
    }
  } catch (error) {
    console.error(error);
    return 1;
  }

  return 0;
};
