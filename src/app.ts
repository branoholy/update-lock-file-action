import { execSync } from 'child_process';
import { unlinkSync } from 'fs';

import { CommitArgs, RepoKit } from './repo-kit';
import { isFileChanged } from './utils/file-utils';
import { parseList } from './utils/string-utils';

export interface AppArgs {
  readonly repository: string;
  readonly token: string;
  readonly commands: string;
  readonly paths: string;
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

export const app = async ({
  repository,
  token,
  commands,
  paths: pathList,
  branch = 'update-files',
  commitMessage = 'Update files',
  commitToken,
  title = commitMessage,
  body = '',
  labels,
  assignees,
  reviewers,
  teamReviewers,
  milestone,
  draft
}: AppArgs) => {
  try {
    // Remove files
    const paths = parseList(pathList);

    paths.forEach((path) => {
      unlinkSync(path);
      console.info(`File "${path}" has been removed`);
    });

    // Run commands
    parseList(commands).forEach((command) => {
      execSync(command);
    });

    // Find changed files
    const changedPaths = paths.reduce<string[]>((acc, path) => {
      if (isFileChanged(path)) {
        console.info(`File "${path}" is changed`);
        return [...acc, path];
      }

      return acc;
    }, []);

    if (changedPaths.length === 0) {
      console.info('No file has been changed');
      return 0;
    }

    // Commit the changed files and create a pull request
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

    // Commit the changed files
    const commitFiles = (kit: RepoKit) => {
      const commitArgs: CommitArgs = {
        commitMessage,
        branch,
        baseBranch: defaultBranchName
      };

      if (changedPaths.length === 1) {
        return kit.commitFile({
          path: changedPaths[0],
          ...commitArgs
        });
      }

      return kit.commitFiles({
        paths: changedPaths,
        ...commitArgs
      });
    };

    if (commitToken) {
      await repoKit.withToken<unknown>(commitToken, commitFiles);
    } else {
      await commitFiles(repoKit);
    }

    console.info('Changed files have been committed');

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
    console.error(error);
    return 1;
  }

  return 0;
};
