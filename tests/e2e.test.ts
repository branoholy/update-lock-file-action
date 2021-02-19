import ChildProcess from 'child_process';
import FileSystem from 'fs';
import Nock from 'nock';
import Path from 'path';

import { main } from '../src/main';
import { TestUtils } from '../src/utils/test-utils';
import { E2EConstants } from './e2e-constants';
import { E2EExpects } from './e2e-expects';
import { E2EMocks } from './e2e-mocks';
import { GitHubMock } from './github-mock';

describe('e2e tests', () => {
  let gitHubMock: GitHubMock;

  beforeAll(() => {
    Nock.disableNetConnect();

    FileSystem.mkdirSync(E2EConstants.testFilesDirectory);

    FileSystem.writeFileSync(Path.join(E2EConstants.testFilesDirectory, 'path1'), 'content1');
    FileSystem.writeFileSync(Path.join(E2EConstants.testFilesDirectory, 'path2'), 'content2');

    ChildProcess.execSync(`git add ${E2EConstants.testFilesDirectory}`);
  });

  afterAll(() => {
    // Restore E2EMocks
    jest.restoreAllMocks();

    // Fix a memory leak
    Nock.restore();

    ChildProcess.execSync(`git reset HEAD ${E2EConstants.testFilesDirectory}`);
    FileSystem.rmdirSync(E2EConstants.testFilesDirectory, { recursive: true });
  });

  beforeEach(() => {
    ChildProcess.execSync(`git checkout ${E2EConstants.testFilesDirectory}`, { stdio: 'ignore' });

    jest.resetAllMocks();
    Nock.cleanAll();

    gitHubMock = new GitHubMock(E2EConstants.repository, E2EConstants.defaultBranch);

    process.env.GITHUB_REPOSITORY = E2EConstants.repository;
    process.env.INPUT_TOKEN = E2EConstants.token;
    process.env.INPUT_PATHS = E2EConstants.paths;
    process.env['INPUT_COMMIT.MESSAGE'] = E2EConstants.commitMessage;
  });

  afterEach(() => {
    delete process.env.GITHUB_REPOSITORY;

    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('INPUT_')) {
        delete process.env[key];
      }
    });
  });

  test('flow #1: no file is changed', async () => {
    // No file is changed
    process.env.INPUT_COMMANDS = `echo -n content1 > ${E2EConstants.testFilesDirectory}/path1, echo -n content2 > ${E2EConstants.testFilesDirectory}/path2`;

    await main();
    expect(E2EMocks.consoleError).not.toBeCalled();
    TestUtils.expectToBeCalled(E2EMocks.processExit, [[0]]);

    TestUtils.expectToBeCalled(E2EMocks.consoleInfo, [['No file has been changed']]);

    // No request to GitHub is made
    expect(gitHubMock.restMocks.any).not.toBeCalled();
  });

  test('flow #2: all files are changed, the branch does not exist, use defaults for the commit and the pull request', async () => {
    const branch = E2EConstants.branchDefaultArg;

    // All files are changed
    process.env.INPUT_COMMANDS = E2EConstants.commands;

    await main();
    expect(E2EMocks.consoleError).not.toBeCalled();
    TestUtils.expectToBeCalled(E2EMocks.processExit, [[0]]);

    TestUtils.expectToBeCalled(E2EMocks.consoleInfo, [
      [`File "${E2EConstants.testFilesDirectory}/path1" is changed`],
      [`File "${E2EConstants.testFilesDirectory}/path2" is changed`],
      [`Branch "${branch}" has been created`],
      ['Changed files have been committed to commit-1-sha'],
      ['Pull request has been created at html_url']
    ]);

    // The branch is not deleted
    expect(gitHubMock.restMocks.git.deleteRef).not.toBeCalled();

    E2EExpects.branchIsCreated(gitHubMock, branch);
    E2EExpects.filesAreCommitted(gitHubMock, branch);
    E2EExpects.pullRequestIsCreated(gitHubMock, branch);
  });

  test('flow #3: all files are changed, the branch exists, delete the branch', async () => {
    // All files are changed
    process.env.INPUT_COMMANDS = E2EConstants.commands;

    // Use a custom branch, delete the branch
    process.env.INPUT_BRANCH = E2EConstants.branch;
    process.env['INPUT_DELETE-BRANCH'] = 'true';

    // The branch exists
    gitHubMock.createBranch(E2EConstants.branch);

    await main();
    expect(E2EMocks.consoleError).not.toBeCalled();
    TestUtils.expectToBeCalled(E2EMocks.processExit, [[0]]);

    TestUtils.expectToBeCalled(E2EMocks.consoleInfo, [
      [`File "${E2EConstants.testFilesDirectory}/path1" is changed`],
      [`File "${E2EConstants.testFilesDirectory}/path2" is changed`],
      [`Branch "${E2EConstants.branch}" already exists`],
      [`Deleting branch "${E2EConstants.branch}"...`],
      [`Branch "${E2EConstants.branch}" has been deleted`],
      [`Branch "${E2EConstants.branch}" has been created`],
      ['Changed files have been committed to commit-1-sha'],
      ['Pull request has been created at html_url']
    ]);

    // The branch is deleted
    TestUtils.expectToBeCalled(gitHubMock.restMocks.git.deleteRef, [
      [expect.stringMatching(new RegExp(`/heads%2F${E2EConstants.branch}$`)), expect.anything()]
    ]);

    E2EExpects.branchIsCreated(gitHubMock, E2EConstants.branch);
    E2EExpects.filesAreCommitted(gitHubMock, E2EConstants.branch);
    E2EExpects.pullRequestIsCreated(gitHubMock, E2EConstants.branch);
  });

  test('flow #4: all files are changed, the branch (ref) exists, do not delete the branch', async () => {
    // All files are changed
    process.env.INPUT_COMMANDS = E2EConstants.commands;

    // Use a custom branch (ref)
    process.env.INPUT_BRANCH = `refs/heads/${E2EConstants.branch}`;

    // The branch exists
    gitHubMock.createBranch(E2EConstants.branch);

    await main();
    expect(E2EMocks.consoleError).not.toBeCalled();
    TestUtils.expectToBeCalled(E2EMocks.processExit, [[0]]);

    TestUtils.expectToBeCalled(E2EMocks.consoleInfo, [
      [`File "${E2EConstants.testFilesDirectory}/path1" is changed`],
      [`File "${E2EConstants.testFilesDirectory}/path2" is changed`],
      [`Branch "${E2EConstants.branch}" already exists`],
      [`Changed files have been committed to commit-1-sha`],
      [`Pull request has been created at html_url`]
    ]);

    // The branch is not deleted
    expect(gitHubMock.restMocks.git.deleteRef).not.toBeCalled();

    // The branch is not created
    expect(gitHubMock.restMocks.git.createRef).not.toBeCalled();

    E2EExpects.filesAreCommitted(gitHubMock, E2EConstants.branch);
    E2EExpects.pullRequestIsCreated(gitHubMock, E2EConstants.branch);
  });

  test('flow #5: all files are changed, the branch exists, do not delete the branch, do not create a pull request', async () => {
    // All files are changed
    process.env.INPUT_COMMANDS = E2EConstants.commands;

    // Use a custom branch, do not create a pull request
    process.env.INPUT_BRANCH = E2EConstants.branch;
    process.env['INPUT_PULL-REQUEST'] = 'false';

    // The branch exists
    gitHubMock.createBranch(E2EConstants.branch);

    await main();
    expect(E2EMocks.consoleError).not.toBeCalled();
    TestUtils.expectToBeCalled(E2EMocks.processExit, [[0]]);

    TestUtils.expectToBeCalled(E2EMocks.consoleInfo, [
      [`File "${E2EConstants.testFilesDirectory}/path1" is changed`],
      [`File "${E2EConstants.testFilesDirectory}/path2" is changed`],
      [`Branch "${E2EConstants.branch}" already exists`],
      [`Changed files have been committed to commit-1-sha`]
    ]);

    // The branch is not deleted
    expect(gitHubMock.restMocks.git.deleteRef).not.toBeCalled();

    // The branch is not created
    expect(gitHubMock.restMocks.git.createRef).not.toBeCalled();

    E2EExpects.filesAreCommitted(gitHubMock, E2EConstants.branch);

    // A pull request is not created
    expect(gitHubMock.restMocks.repos.getBranch).not.toBeCalled();
    expect(gitHubMock.restMocks.pulls.create).not.toBeCalled();
  });

  test('flow #6: all files are changed, the branch exists, do not delete the branch, amend the commit, do not create a pull request', async () => {
    // All files are changed
    process.env.INPUT_COMMANDS = E2EConstants.commands;

    // Use a custom branch
    process.env.INPUT_BRANCH = E2EConstants.branch;

    // Amend the commit
    process.env['INPUT_COMMIT.AMEND'] = 'true';

    // Do not create a pull request
    process.env['INPUT_PULL-REQUEST'] = 'false';

    // The branch exists
    gitHubMock.createBranch(E2EConstants.branch);
    gitHubMock.commit(E2EConstants.branch);

    await main();
    expect(E2EMocks.consoleError).not.toBeCalled();
    TestUtils.expectToBeCalled(E2EMocks.processExit, [[0]]);

    TestUtils.expectToBeCalled(E2EMocks.consoleInfo, [
      [`File "${E2EConstants.testFilesDirectory}/path1" is changed`],
      [`File "${E2EConstants.testFilesDirectory}/path2" is changed`],
      [`Branch "${E2EConstants.branch}" already exists`],
      [`Changed files have been committed to commit-2-sha`]
    ]);

    // The branch is not deleted
    expect(gitHubMock.restMocks.git.deleteRef).not.toBeCalled();

    // The branch is not created
    expect(gitHubMock.restMocks.git.createRef).not.toBeCalled();

    E2EExpects.filesAreCommitted(gitHubMock, E2EConstants.branch, true);

    // A pull request is not created
    expect(gitHubMock.restMocks.repos.getBranch).not.toBeCalled();
    expect(gitHubMock.restMocks.pulls.create).not.toBeCalled();
  });

  test('flow #7: an exception is thrown', async () => {
    const command = 'sh -c "exit 1"';

    process.env.INPUT_COMMANDS = command;
    const error = new Error(`Command failed: ${command}`);

    await main();
    expect(E2EMocks.consoleInfo).not.toBeCalled();
    TestUtils.expectToBeCalled(E2EMocks.processExit, [[1]]);

    expect(E2EMocks.consoleError).toBeCalledTimes(1);
    expect(E2EMocks.consoleError.mock.calls[0]?.[0].toString()).toBe(error.toString());

    // No request to GitHub is made
    expect(gitHubMock.restMocks.any).not.toBeCalled();
  });

  test('flow #8: all files are changed, the branch does not exist, use all custom arguments for the pull request', async () => {
    // All files are changed
    process.env.INPUT_COMMANDS = E2EConstants.commands;

    // Use a custom branch, specify pull request arguments
    process.env.INPUT_BRANCH = E2EConstants.branch;
    process.env['INPUT_PULL-REQUEST.TITLE'] = E2EConstants.pullRequestTitle;
    process.env['INPUT_PULL-REQUEST.BODY'] = E2EConstants.pullRequestBody;
    process.env['INPUT_PULL-REQUEST.LABELS'] = E2EConstants.pullRequestLabels;
    process.env['INPUT_PULL-REQUEST.ASSIGNEES'] = E2EConstants.pullRequestAssignees;
    process.env['INPUT_PULL-REQUEST.REVIEWERS'] = E2EConstants.pullRequestReviewers;
    process.env['INPUT_PULL-REQUEST.TEAM-REVIEWERS'] = E2EConstants.pullRequestTeamReviewers;
    process.env['INPUT_PULL-REQUEST.MILESTONE'] = E2EConstants.pullRequestMilestone;
    process.env['INPUT_PULL-REQUEST.DRAFT'] = E2EConstants.pullRequestDraft;

    await main();
    expect(E2EMocks.consoleError).not.toBeCalled();
    TestUtils.expectToBeCalled(E2EMocks.processExit, [[0]]);

    TestUtils.expectToBeCalled(E2EMocks.consoleInfo, [
      [`File "${E2EConstants.testFilesDirectory}/path1" is changed`],
      [`File "${E2EConstants.testFilesDirectory}/path2" is changed`],
      [`Branch "${E2EConstants.branch}" has been created`],
      [`Changed files have been committed to commit-1-sha`],
      [`Pull request has been created at html_url`]
    ]);

    // The branch is not deleted
    expect(gitHubMock.restMocks.git.deleteRef).not.toBeCalled();

    E2EExpects.branchIsCreated(gitHubMock, E2EConstants.branch);
    E2EExpects.filesAreCommitted(gitHubMock, E2EConstants.branch);
    E2EExpects.pullRequestIsCreated(gitHubMock, E2EConstants.branch, true);
  });

  test('flow #9: wrong repository is used', async () => {
    // A wrong repository is used
    process.env.GITHUB_REPOSITORY = 'wrong';
    process.env.INPUT_COMMANDS = E2EConstants.commands;

    await main();
    expect(E2EMocks.consoleInfo).not.toBeCalled();
    TestUtils.expectToBeCalled(E2EMocks.processExit, [[1]]);

    TestUtils.expectToBeCalled(E2EMocks.consoleError, [
      [new Error('Repository "wrong" does not have the valid format (owner/repositoryName)')]
    ]);

    // No request to GitHub is made
    expect(gitHubMock.restMocks.any).not.toBeCalled();
  });

  test('flow #10: commit message is missing', async () => {
    // The commit message is missing
    process.env['INPUT_COMMIT.MESSAGE'] = '';
    process.env.INPUT_COMMANDS = E2EConstants.commands;

    await main();
    expect(E2EMocks.consoleInfo).not.toBeCalled();
    TestUtils.expectToBeCalled(E2EMocks.processExit, [[1]]);

    TestUtils.expectToBeCalled(E2EMocks.consoleError, [
      [new Error('Commit message is missing, please specify the "commit.message" input')]
    ]);

    // No request to GitHub is made
    expect(gitHubMock.restMocks.any).not.toBeCalled();
  });
});
