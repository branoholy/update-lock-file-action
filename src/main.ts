import { execSync } from 'child_process';
import { unlinkSync } from 'fs';

import { getDependencyManager } from './dependency-manager';
import { RepoKit } from './repo-kit';
import { isFileChanged } from './utils/file-utils';

export interface MainArgs {
  readonly owner: string;
  readonly repository: string;
  readonly branchName?: string;
  readonly commitMessage?: string;
  readonly commitToken: string;
  readonly pullRequestTitle?: string;
  readonly pullRequestBody?: string;
  readonly pullRequestToken?: string;
}

export const main = async ({
  owner,
  repository,
  branchName = 'update-lock-file',
  commitMessage = 'Update lock file',
  commitToken,
  pullRequestTitle = commitMessage,
  pullRequestBody = '',
  pullRequestToken = commitToken
}: MainArgs) => {
  try {
    const dependencyManager = getDependencyManager();

    if (!dependencyManager) {
      console.log('No lock file was found');
      return 0;
    }

    console.log(`Found ${dependencyManager.lockFilePath}`);

    unlinkSync(dependencyManager.lockFilePath);
    execSync(dependencyManager.installCommand);

    if (!isFileChanged(dependencyManager.lockFilePath)) {
      console.log('Lock file is up to date');
      return 0;
    }

    console.log('Lock file is outdated');

    const repoKit = new RepoKit(owner, repository, commitToken);

    if (await repoKit.hasBranch(branchName)) {
      console.log(`Branch ${branchName} already exists`);
      console.log(`Deleting branch ${branchName}...`);
      await repoKit.deleteBranch(branchName);
      console.log(`Branch ${branchName} has been deleted`);
    }

    const {
      object: { sha }
    } = await repoKit.getBranch('develop');
    await repoKit.createBranch(branchName, sha);
    console.log(`Branch ${branchName} has been created`);

    await repoKit.commitFile(dependencyManager.lockFilePath, commitMessage, branchName, 'develop');
    console.log('Updated lock file has been committed');

    if (pullRequestToken && pullRequestToken !== commitToken) {
      repoKit.setToken(pullRequestToken);
    }

    const pullRequest = await repoKit.createPullRequest(branchName, 'develop', pullRequestTitle, pullRequestBody);
    console.log(`Pull request has been created at ${pullRequest.html_url}`);
  } catch (error) {
    console.log(error);
    return 1;
  }

  return 0;
};
