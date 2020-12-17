import { execSync } from 'child_process';

import { app } from '../app';
import { RepoKit } from '../repo-kit';
import { FileUtils } from '../utils/file-utils';
import { TestUtils } from '../utils/test-utils';
import { Awaited } from '../utils/type-utils';

const consoleInfoMock = jest.spyOn(console, 'info');
const consoleErrorMock = jest.spyOn(console, 'error');

jest.mock('child_process');
const execSyncMock = TestUtils.asMockedFunction(execSync);

jest.mock('../utils/file-utils');
const isFileChangedMock = TestUtils.asMockedFunction(FileUtils.isFileChanged);

jest.mock('../repo-kit');
const RepoKitMock = TestUtils.asMockedClass(RepoKit);

describe('app', () => {
  const owner = 'owner';
  const repositoryName = 'repository-name';
  const repository = `${owner}/${repositoryName}`;
  const token = 'token';
  const commitToken = 'commit-token';
  const commands = ['command1', 'command2'];
  const paths = ['path1', 'path2'];
  const branch = 'branch';
  const defaultBranch = 'default-branch';
  const defaultBranchSha = 'default-branch-sha';

  const commitMessage = 'commit-message';
  const title = 'pull-request-title';
  const body = 'pull-request-body';

  const labels = ['label1', 'label2'];
  const assignees = ['assignee1'];
  const reviewers = ['reviewer1', 'reviewer2', 'reviewer3'];
  const teamReviewers = ['teamReviewer1'];
  const milestone = 42;
  const draft = true;

  const getDefaultBranchResult: Awaited<ReturnType<RepoKit['getDefaultBranch']>> = {
    object: { sha: defaultBranchSha, type: 'type', url: 'utl' },
    name: defaultBranch,
    node_id: 'node_id',
    ref: 'ref',
    url: 'url'
  };

  const createPullRequestResult = {
    html_url: 'html_url'
  } as Awaited<ReturnType<RepoKit['createPullRequest']>>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  /**
   * Flow #1
   * -------
   * - run all commands
   * - check changes of all files
   * = mock: no file is changed
   * - do not call GitHub API (do not create RepoKit)
   * - return 0
   */
  it('flow #1: no file is changed', async () => {
    isFileChangedMock.mockReturnValueOnce(false).mockReturnValueOnce(false);

    expect(await app({ repository, token, commands, paths })).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);

    expect(RepoKitMock.mock.instances.length).toBe(0);

    TestUtils.expectToBeCalled(consoleInfoMock, [['No file has been changed']]);
  });

  /**
   * Flow #2
   * -------
   * - run all commands
   * - check changes of all files
   * = mock: all files are changed
   * - check existence of the branch
   * = mock: the branch does not exist
   * - do not try to delete the branch
   * - create the branch
   * - commit all files with the default commit message
   * - create a pull request with the default title and body
   * - return 0
   */
  it('flow #2: all files are changed, the branch does not exist, use defaults', async () => {
    const defaultBranchArg = 'update-files';

    isFileChangedMock.mockReturnValueOnce(true).mockReturnValueOnce(true);

    RepoKitMock.prototype.hasBranch.mockResolvedValue(false);
    RepoKitMock.prototype.getDefaultBranch.mockResolvedValue(getDefaultBranchResult);
    RepoKitMock.prototype.createPullRequest.mockResolvedValue(createPullRequestResult);

    expect(await app({ repository, token, commands, paths })).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);

    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[defaultBranchArg]]);
    expect(RepoKitMock.mock.instances[0]?.deleteBranch).not.toBeCalled();
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.getDefaultBranch, [[]]);
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createBranch, [[defaultBranchArg, defaultBranchSha]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.commitFiles, [
      [
        {
          branch: defaultBranchArg,
          baseBranch: defaultBranch,
          paths: ['path1', 'path2'],
          commitMessage: 'Update files'
        }
      ]
    ]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createPullRequest, [
      [
        {
          branch: defaultBranchArg,
          baseBranch: defaultBranch,
          title: 'Update files',
          body: '',
          draft: false
        }
      ]
    ]);

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      [`Branch "${defaultBranchArg}" has been created`],
      ['Changed files have been committed'],
      ['Pull request has been created at html_url']
    ]);
  });

  /**
   * Flow #3
   * -------
   * - run all commands
   * - check changes of all files
   * = mock: all files are changed
   * - check existence of the branch
   * = mock: the branch exists
   * - delete the branch
   * - create the branch
   * - commit all files
   * - create a pull request
   * - return 0
   */
  it('flow #3: all files are changed, the branch exists', async () => {
    isFileChangedMock.mockReturnValueOnce(true).mockReturnValueOnce(true);

    RepoKitMock.prototype.hasBranch.mockResolvedValue(true);
    RepoKitMock.prototype.getDefaultBranch.mockResolvedValue(getDefaultBranchResult);
    RepoKitMock.prototype.createPullRequest.mockResolvedValue(createPullRequestResult);

    expect(await app({ repository, token, commands, paths, branch })).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);

    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branch]]);
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.deleteBranch, [[branch]]);
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.getDefaultBranch, [[]]);
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createBranch, [[branch, defaultBranchSha]]);

    expect(RepoKitMock.mock.instances[0]?.commitFiles.mock.calls[0]?.[0]).toMatchObject({
      branch,
      baseBranch: defaultBranch,
      paths: ['path1', 'path2']
    });

    expect(RepoKitMock.mock.instances[0]?.createPullRequest.mock.calls[0]?.[0]).toMatchObject({
      branch,
      baseBranch: defaultBranch
    });

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      ['Branch "branch" already exists'],
      ['Deleting branch "branch"...'],
      ['Branch "branch" has been deleted'],
      ['Branch "branch" has been created'],
      ['Changed files have been committed'],
      ['Pull request has been created at html_url']
    ]);
  });

  /**
   * Flow #4
   * -------
   * - run all commands
   * - check changes of all files
   * = mock: one file is changed
   * - check existence of the branch
   * = mock: the branch does not exist
   * - do not try to delete the branch
   * - create the branch
   * - commit the changed file
   * - create a pull request
   * - return 0
   */
  it('flow #4: one file is changed, the branch does not exist', async () => {
    isFileChangedMock.mockReturnValueOnce(false).mockReturnValueOnce(true);

    RepoKitMock.prototype.hasBranch.mockResolvedValue(false);
    RepoKitMock.prototype.getDefaultBranch.mockResolvedValue(getDefaultBranchResult);
    RepoKitMock.prototype.createPullRequest.mockResolvedValue(createPullRequestResult);

    expect(await app({ repository, token, commands, paths, branch })).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);

    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branch]]);
    expect(RepoKitMock.mock.instances[0]?.deleteBranch).not.toBeCalled();
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.getDefaultBranch, [[]]);
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createBranch, [[branch, defaultBranchSha]]);

    expect(RepoKitMock.mock.instances[0]?.commitFile.mock.calls[0]?.[0]).toMatchObject({
      branch,
      baseBranch: defaultBranch,
      path: 'path2'
    });

    expect(RepoKitMock.mock.instances[0]?.createPullRequest.mock.calls[0]?.[0]).toMatchObject({
      branch,
      baseBranch: defaultBranch
    });

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path2" is changed'],
      ['Branch "branch" has been created'],
      ['Changed files have been committed'],
      ['Pull request has been created at html_url']
    ]);
  });

  /**
   * Flow #5
   * -------
   * - run all commands
   * - check changes of all files
   * = mock: all files are changed
   * - check existence of the branch
   * = mock: the branch does not exist
   * - do not try to delete the branch
   * - create the branch
   * - commit all files with the commit token
   * - create a pull request
   * - return 0
   */
  it('flow #5: all files are changed, the branch does not exist, use the commit token', async () => {
    isFileChangedMock.mockReturnValueOnce(true).mockReturnValueOnce(true);

    RepoKitMock.prototype.hasBranch.mockResolvedValue(false);
    RepoKitMock.prototype.getDefaultBranch.mockResolvedValue(getDefaultBranchResult);
    RepoKitMock.prototype.withToken.mockImplementationOnce((customToken, fn) =>
      fn(new RepoKit(owner, repositoryName, customToken))
    );
    RepoKitMock.prototype.createPullRequest.mockResolvedValue(createPullRequestResult);

    expect(await app({ repository, token, commands, paths, branch, commitToken })).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);

    TestUtils.expectToBeCalled(RepoKitMock, [
      [owner, repositoryName, token],
      [owner, repositoryName, commitToken]
    ]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branch]]);
    expect(RepoKitMock.mock.instances[0]?.deleteBranch).not.toBeCalled();
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.getDefaultBranch, [[]]);
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createBranch, [[branch, defaultBranchSha]]);

    expect(RepoKitMock.mock.instances[1]?.commitFiles.mock.calls[0]?.[0]).toMatchObject({
      branch,
      baseBranch: defaultBranch,
      paths: ['path1', 'path2']
    });

    expect(RepoKitMock.mock.instances[0]?.createPullRequest.mock.calls[0]?.[0]).toMatchObject({
      branch,
      baseBranch: defaultBranch
    });

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      ['Branch "branch" has been created'],
      ['Changed files have been committed'],
      ['Pull request has been created at html_url']
    ]);
  });

  /**
   * Flow #6
   * -------
   * - run all commands
   * = mock: an exception is thrown
   * - do not call GitHub API (do not create RepoKit)
   * - return 1
   */
  it('flow #6: an exception is thrown', async () => {
    const error = new Error('error-message');

    isFileChangedMock.mockReturnValueOnce(false).mockReturnValueOnce(false);

    execSyncMock.mockImplementationOnce(() => {
      throw error;
    });

    expect(await app({ repository, token, commands, paths })).toBe(1);

    TestUtils.expectToBeCalled(execSyncMock, [['command1']]);

    expect(RepoKitMock.mock.instances.length).toBe(0);

    expect(consoleInfoMock).not.toBeCalled();
    TestUtils.expectToBeCalled(consoleErrorMock, [[error]]);
  });

  /**
   * Flow #7
   * -------
   * - run all commands
   * - check changes of all files
   * = mock: all files are changed
   * - check existence of the branch
   * = mock: the branch does not exist
   * - do not try to delete the branch
   * - create the branch
   * - commit all files with the commit message
   * - create a pull request with the title and body
   * - return 0
   */
  it('flow #7: all files are changed, the branch does not exist, use custom commit message, title, body', async () => {
    isFileChangedMock.mockReturnValueOnce(true).mockReturnValueOnce(true);

    RepoKitMock.prototype.hasBranch.mockResolvedValue(false);
    RepoKitMock.prototype.getDefaultBranch.mockResolvedValue(getDefaultBranchResult);
    RepoKitMock.prototype.createPullRequest.mockResolvedValue(createPullRequestResult);

    expect(await app({ repository, token, commands, paths, branch, commitMessage, title, body })).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);

    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branch]]);
    expect(RepoKitMock.mock.instances[0]?.deleteBranch).not.toBeCalled();
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.getDefaultBranch, [[]]);
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createBranch, [[branch, defaultBranchSha]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.commitFiles, [
      [
        {
          branch,
          baseBranch: defaultBranch,
          paths: ['path1', 'path2'],
          commitMessage
        }
      ]
    ]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createPullRequest, [
      [
        {
          branch,
          baseBranch: defaultBranch,
          title,
          body,
          draft: false
        }
      ]
    ]);

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      ['Branch "branch" has been created'],
      ['Changed files have been committed'],
      ['Pull request has been created at html_url']
    ]);
  });

  /**
   * Flow #8
   * -------
   * - run all commands
   * - check changes of all files
   * = mock: all files are changed
   * - check existence of the branch
   * = mock: the branch does not exist
   * - do not try to delete the branch
   * - create the branch
   * - commit all files with the commit message
   * - create a pull request with all custom arguments
   * - return 0
   */
  it('flow #8: all files are changed, the branch does not exist, use all custom arguments', async () => {
    isFileChangedMock.mockReturnValueOnce(true).mockReturnValueOnce(true);

    RepoKitMock.prototype.hasBranch.mockResolvedValue(false);
    RepoKitMock.prototype.getDefaultBranch.mockResolvedValue(getDefaultBranchResult);
    RepoKitMock.prototype.createPullRequest.mockResolvedValue(createPullRequestResult);

    expect(
      await app({
        repository,
        token,
        commands,
        paths,
        branch,
        commitMessage,
        title,
        body,
        labels,
        assignees,
        reviewers,
        teamReviewers,
        milestone,
        draft
      })
    ).toBe(0);

    TestUtils.expectToBeCalled(execSyncMock, [['command1'], ['command2']]);
    TestUtils.expectToBeCalled(isFileChangedMock, [['path1'], ['path2']]);

    TestUtils.expectToBeCalled(RepoKitMock, [[owner, repositoryName, token]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.hasBranch, [[branch]]);
    expect(RepoKitMock.mock.instances[0]?.deleteBranch).not.toBeCalled();
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.getDefaultBranch, [[]]);
    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createBranch, [[branch, defaultBranchSha]]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.commitFiles, [
      [
        {
          branch,
          baseBranch: defaultBranch,
          paths: ['path1', 'path2'],
          commitMessage
        }
      ]
    ]);

    TestUtils.expectToBeCalled(RepoKitMock.mock.instances[0]?.createPullRequest, [
      [
        {
          branch,
          baseBranch: defaultBranch,
          title,
          body,
          labels: ['label1', 'label2'],
          assignees: ['assignee1'],
          reviewers: ['reviewer1', 'reviewer2', 'reviewer3'],
          teamReviewers: ['teamReviewer1'],
          milestone: 42,
          draft: true
        }
      ]
    ]);

    TestUtils.expectToBeCalled(consoleInfoMock, [
      ['File "path1" is changed'],
      ['File "path2" is changed'],
      ['Branch "branch" has been created'],
      ['Changed files have been committed'],
      ['Pull request has been created at html_url']
    ]);
  });

  /**
   * Flow #9
   * -------
   * - wrong repository is used
   * - do not run commands
   * - do not call GitHub API (do not create RepoKit)
   * - print an error
   * - return 1
   */
  it('flow #9: wrong repository is used', async () => {
    expect(
      await app({
        repository: 'wrong',
        token,
        commands,
        paths
      })
    ).toBe(1);

    expect(execSyncMock).not.toBeCalled();
    expect(RepoKitMock.mock.instances.length).toBe(0);

    TestUtils.expectToBeCalled(consoleErrorMock, [
      ['Error: Repository "wrong" does not have the valid format (owner/repositoryName)']
    ]);
  });
});
