import * as ActionsCore from '@actions/core';
import { execSync } from 'child_process';

import { app, AppArgs, CommitArgs, PullRequestArgs } from '../app';
import { RepoKit } from '../repo-kit';
import { FileUtils } from '../utils/file-utils';
import { TestUtils } from '../utils/test-utils';
import { Awaited } from '../utils/type-utils';

const consoleInfoMock = jest.spyOn(console, 'info');
const consoleErrorMock = jest.spyOn(console, 'error');

jest.mock('@actions/core');
const actionsCoreSetOutputMock = TestUtils.asMockedFunction(ActionsCore.setOutput);

jest.mock('child_process');
const execSyncMock = TestUtils.asMockedFunction(execSync);

jest.mock('../utils/file-utils');
const isFileChangedMock = TestUtils.asMockedFunction(FileUtils.isFileChanged);

jest.mock('../repo-kit');
const RepoKitMock = TestUtils.asMockedClass(RepoKit);

describe('app', () => {
  const branchArgDefault = 'update-files';

  const owner = 'owner';
  const repositoryName = 'repository-name';
  const repository = `${owner}/${repositoryName}`;
  const token = 'token';

  const commands = ['command1', 'command2'];
  const paths = ['path1', 'path2'];
  const branch = 'branch';

  const commit: CommitArgs = {
    message: 'commit-message'
  };

  const pullRequest: PullRequestArgs = {
    title: 'pull-request-title',
    body: 'pull-request-body',
    labels: ['label1', 'label2'],
    assignees: ['assignee1'],
    reviewers: ['reviewer1', 'reviewer2', 'reviewer3'],
    teamReviewers: ['teamReviewer1'],
    milestone: 42,
    draft: true
  };

  const appArgs: AppArgs = {
    repository,
    token,
    commands,
    paths,
    commit,
    pullRequest: {}
  };

  const defaultBranch = 'default-branch';
  const defaultBranchSha = 'default-branch-sha';

  const getDefaultBranchResult: Awaited<ReturnType<RepoKit['getDefaultBranch']>> = {
    object: { sha: defaultBranchSha, type: 'type', url: 'utl' },
    name: defaultBranch,
    node_id: 'node_id',
    ref: 'ref',
    url: 'url'
  };

  const commitFilesResult = {
    sha: 'new-commit-sha'
  } as Awaited<ReturnType<RepoKit['commitFiles']>>;

  const createPullRequestResult = {
    html_url: 'html_url'
  } as Awaited<ReturnType<RepoKit['createPullRequest']>>;

  beforeEach(() => {
    jest.resetAllMocks();

    RepoKitMock.prototype.getDefaultBranchName.mockResolvedValue(defaultBranch);
    RepoKitMock.prototype.getDefaultBranch.mockResolvedValue(getDefaultBranchResult);
    RepoKitMock.prototype.commitFiles.mockResolvedValue(commitFilesResult);
    RepoKitMock.prototype.createPullRequest.mockResolvedValue(createPullRequestResult);
  });

  it('flow #1: no file is changed', async () => {
    isFileChangedMock.mockReturnValue(false);

    expect(await app(appArgs)).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);

    expect(RepoKitMock.mock.instances.length).toBe(0);

    TestUtils.expectToBeCalled(consoleInfoMock, [['No file has been changed']]);
  });

  it('flow #2: all files are changed, the branch does not exist, use defaults for the commit and the pull request', async () => {
    isFileChangedMock.mockReturnValue(true);
    RepoKitMock.prototype.hasBranch.mockResolvedValue(false);

    expect(await app(appArgs)).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);
    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branchArgDefault]]);
    expect(RepoKitMock.mock.instances[0]?.deleteBranch).not.toBeCalled();
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createBranch, [[branchArgDefault, defaultBranchSha]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.commitFiles, [
      [
        {
          branch: branchArgDefault,
          paths,
          message: commit.message
        }
      ]
    ]);

    TestUtils.expectToBeCalled(actionsCoreSetOutputMock, [['commit.sha', commitFilesResult.sha]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createPullRequest, [
      [
        {
          branch: branchArgDefault,
          baseBranch: defaultBranch
        }
      ]
    ]);

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      [`Branch "${branchArgDefault}" has been created`],
      [`Changed files have been committed to ${commitFilesResult.sha}`],
      [`Pull request has been created at ${createPullRequestResult.html_url}`]
    ]);
  });

  it('flow #3: all files are changed, the branch exists, delete the branch', async () => {
    isFileChangedMock.mockReturnValue(true);
    RepoKitMock.prototype.hasBranch.mockResolvedValue(true);

    expect(await app({ ...appArgs, branch, deleteBranch: true })).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);
    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branch]]);
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.deleteBranch, [[branch]]);
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createBranch, [[branch, defaultBranchSha]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.commitFiles, [
      [
        {
          branch,
          paths,
          message: commit.message
        }
      ]
    ]);

    TestUtils.expectToBeCalled(actionsCoreSetOutputMock, [['commit.sha', commitFilesResult.sha]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createPullRequest, [
      [
        {
          branch,
          baseBranch: defaultBranch
        }
      ]
    ]);

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      [`Branch "${branch}" already exists`],
      [`Deleting branch "${branch}"...`],
      [`Branch "${branch}" has been deleted`],
      [`Branch "${branch}" has been created`],
      [`Changed files have been committed to ${commitFilesResult.sha}`],
      [`Pull request has been created at ${createPullRequestResult.html_url}`]
    ]);
  });

  it('flow #4: all files are changed, the branch (ref) exists, do not delete the branch', async () => {
    isFileChangedMock.mockReturnValue(true);
    RepoKitMock.prototype.hasBranch.mockResolvedValue(true);

    expect(await app({ ...appArgs, branch: `refs/heads/${branch}` })).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);
    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branch]]);
    expect(RepoKitMock.mock.instances[0]?.deleteBranch).not.toBeCalled();
    expect(RepoKitMock.mock.instances[0]?.createBranch).not.toBeCalled();

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.commitFiles, [
      [
        {
          branch,
          paths,
          message: commit.message
        }
      ]
    ]);

    TestUtils.expectToBeCalled(actionsCoreSetOutputMock, [['commit.sha', commitFilesResult.sha]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createPullRequest, [
      [
        {
          branch,
          baseBranch: defaultBranch
        }
      ]
    ]);

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      [`Branch "${branch}" already exists`],
      [`Changed files have been committed to ${commitFilesResult.sha}`],
      [`Pull request has been created at ${createPullRequestResult.html_url}`]
    ]);
  });

  it('flow #5: all files are changed, the branch exists, do not delete the branch, do not create a pull request', async () => {
    isFileChangedMock.mockReturnValue(true);
    RepoKitMock.prototype.hasBranch.mockResolvedValue(true);

    expect(await app({ ...appArgs, branch, pullRequest: undefined })).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);
    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branch]]);
    expect(RepoKitMock.mock.instances[0]?.deleteBranch).not.toBeCalled();
    expect(RepoKitMock.mock.instances[0]?.createBranch).not.toBeCalled();

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.commitFiles, [
      [
        {
          branch,
          paths,
          message: commit.message
        }
      ]
    ]);

    TestUtils.expectToBeCalled(actionsCoreSetOutputMock, [['commit.sha', commitFilesResult.sha]]);

    expect(RepoKitMock.mock.instances[0]?.createPullRequest).not.toBeCalled();

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      [`Branch "${branch}" already exists`],
      [`Changed files have been committed to ${commitFilesResult.sha}`]
    ]);
  });

  it('flow #6: all files are changed, the branch exists, do not delete the branch, amend the commit, do not create a pull request', async () => {
    isFileChangedMock.mockReturnValue(true);
    RepoKitMock.prototype.hasBranch.mockResolvedValue(true);

    expect(
      await app({
        ...appArgs,
        branch,
        commit: {
          ...commit,
          amend: true
        },
        pullRequest: undefined
      })
    ).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);
    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branch]]);
    expect(RepoKitMock.mock.instances[0]?.deleteBranch).not.toBeCalled();
    expect(RepoKitMock.mock.instances[0]?.createBranch).not.toBeCalled();

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.commitFiles, [
      [
        {
          branch,
          paths,
          message: commit.message,
          amend: true
        }
      ]
    ]);

    TestUtils.expectToBeCalled(actionsCoreSetOutputMock, [['commit.sha', commitFilesResult.sha]]);

    expect(RepoKitMock.mock.instances[0]?.createPullRequest).not.toBeCalled();

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      [`Branch "${branch}" already exists`],
      [`Changed files have been committed to ${commitFilesResult.sha}`]
    ]);
  });

  it('flow #7: an exception is thrown', async () => {
    const error = new Error('error-message');

    isFileChangedMock.mockReturnValue(false);

    isFileChangedMock.mockImplementationOnce(() => {
      throw error;
    });

    expect(await app(appArgs)).toBe(1);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1']]);

    expect(RepoKitMock.mock.instances.length).toBe(0);

    expect(consoleInfoMock).not.toBeCalled();
    TestUtils.expectToBeCalled(consoleErrorMock, [[error]]);
  });

  it('flow #8: all files are changed, the branch does not exist, use all custom arguments for the pull request', async () => {
    isFileChangedMock.mockReturnValue(true);
    RepoKitMock.prototype.hasBranch.mockResolvedValue(false);

    expect(await app({ ...appArgs, branch, pullRequest })).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);
    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branch]]);
    expect(RepoKitMock.mock.instances[0]?.deleteBranch).not.toBeCalled();
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createBranch, [[branch, defaultBranchSha]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.commitFiles, [
      [
        {
          branch,
          paths,
          message: commit.message
        }
      ]
    ]);

    TestUtils.expectToBeCalled(actionsCoreSetOutputMock, [['commit.sha', commitFilesResult.sha]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createPullRequest, [
      [
        {
          branch,
          baseBranch: defaultBranch,
          ...pullRequest
        }
      ]
    ]);

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      [`Branch "${branch}" has been created`],
      [`Changed files have been committed to ${commitFilesResult.sha}`],
      [`Pull request has been created at ${createPullRequestResult.html_url}`]
    ]);
  });

  it('flow #9: wrong repository is used', async () => {
    expect(await app({ ...appArgs, repository: 'wrong' })).toBe(1);

    expect(execSyncMock).not.toBeCalled();
    expect(isFileChangedMock).not.toBeCalled();
    expect(RepoKitMock.mock.instances.length).toBe(0);

    TestUtils.expectToBeCalled(consoleErrorMock, [
      [new Error('Repository "wrong" does not have the valid format (owner/repositoryName)')]
    ]);
  });

  it('flow #10: commit message is missing', async () => {
    expect(await app({ ...appArgs, commit: {} })).toBe(1);

    expect(execSyncMock).not.toBeCalled();
    expect(isFileChangedMock).not.toBeCalled();
    expect(RepoKitMock.mock.instances.length).toBe(0);

    TestUtils.expectToBeCalled(consoleErrorMock, [
      [new Error('Commit message is missing, please specify the "commit.message" input')]
    ]);
  });
});
