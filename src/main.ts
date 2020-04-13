import { execSync } from 'child_process';
import { unlinkSync } from 'fs';

import { getDependencyManager } from './dependency-manager';
import { RepoKit } from './repo-kit';
import { isFileChanged } from './utils/file-utils';
import { parseList } from './utils/string-utils';

export interface MainArgs {
  readonly repository: string;
  readonly token: string;
  readonly branch?: string;
  readonly commitMessage?: string;
  readonly commitToken?: string;
  readonly title?: string;
  readonly body?: string;
  readonly labels?: string;
  readonly assignees?: string;
  readonly reviewers?: string;
  readonly teamReviewers?: string;
  readonly milestone?: string;
  readonly draft?: string;
}

export const main = async ({
  repository,
  token,
  branch = 'update-lock-file',
  commitMessage = 'Update lock file',
  commitToken,
  title = commitMessage,
  body = '',
  labels,
  assignees,
  reviewers,
  teamReviewers,
  milestone,
  draft
}: MainArgs) => {
  try {
    // Find a lock file along with the corresponding dependency manager
    const dependencyManager = getDependencyManager();

    if (!dependencyManager) {
      console.info('Lock file not found');
      return 0;
    }

    console.info(`Found "${dependencyManager.lockFilePath}"`);

    // Recreate the lock file
    unlinkSync(dependencyManager.lockFilePath);
    execSync(dependencyManager.installCommand);

    // Check if the lock file is up to date
    if (!isFileChanged(dependencyManager.lockFilePath)) {
      console.info('Lock file is up to date');
      return 0;
    }

    console.info('Lock file is outdated');

    // Commit the lock file and create a pull request
    const [owner, repositoryName] = repository.split('/');
    const repoKit = new RepoKit(owner, repositoryName, token);

    // Delete the branch if it exists
    if (await repoKit.hasBranch(branch)) {
      console.info(`Branch "${branch}" already exists`);
      console.info(`Deleting branch "${branch}"...`);
      await repoKit.deleteBranch(branch);
      console.info(`Branch "${branch}" has been deleted`);
    }

    // Create the branch
    const {
      object: { sha: defaultBranchSha },
      name: defaultBranchName
    } = await repoKit.getDefaultBranch();

    await repoKit.createBranch(branch, defaultBranchSha);
    console.info(`Branch "${branch}" has been created`);

    // Commit the lock file
    const commitFile = (kit: RepoKit) =>
      kit.commitFile({
        path: dependencyManager.lockFilePath,
        commitMessage,
        branch,
        baseBranch: defaultBranchName
      });

    if (commitToken) {
      await repoKit.withToken(commitToken, commitFile);
    } else {
      await commitFile(repoKit);
    }

    console.info('Updated lock file has been committed');

    // Create the pull request
    const pullRequest = await repoKit.createPullRequest({
      branch,
      baseBranch: defaultBranchName,
      title,
      body,
      labels: parseList(labels),
      assignees: parseList(assignees),
      reviewers: parseList(reviewers),
      teamReviewers: parseList(teamReviewers),
      milestone: milestone ? parseInt(milestone, 10) : undefined,
      draft: draft === 'true'
    });

    console.info(`Pull request has been created at ${pullRequest.html_url}`);
  } catch (error) {
    console.info(error);
    return 1;
  }

  return 0;
};
