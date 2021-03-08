import * as envalid from 'envalid';

import { app, PullRequestArgs } from '../app';
import { main } from '../main';
import { ActionUtils } from '../utils/action-utils';
import { TestUtils } from '../utils/test-utils';

const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();
const processExitMock = jest.spyOn(process, 'exit').mockImplementation();

jest.mock('envalid');
const envalidMock = {
  cleanEnv: TestUtils.asMockedFunction(envalid.cleanEnv),
  str: TestUtils.asMockedFunction(envalid.str)
};

jest.mock('../app');
const appMock = TestUtils.asMockedFunction(app);

jest.mock('../utils/action-utils');
const ActionUtilsMock = {
  getInputAsBoolean: TestUtils.asMockedFunction(ActionUtils.getInputAsBoolean),
  getInputAsInteger: TestUtils.asMockedFunction(ActionUtils.getInputAsInteger),
  getInputAsString: TestUtils.asMockedFunction(ActionUtils.getInputAsString),
  getInputAsStrings: TestUtils.asMockedFunction(ActionUtils.getInputAsStrings)
};

describe('main', () => {
  const repository = 'owner/repository-name';
  const token = 'token';
  const paths = ['path1', 'path2'];
  const branch = 'branch';
  const commitMessage = 'commit-message';
  const commitToken = 'commit-token';

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

  const mockEnv = () => {
    envalidMock.str.mockReturnValue({
      _parse: jest.fn()
    });

    envalidMock.cleanEnv.mockReturnValue(({ GITHUB_REPOSITORY: repository } as unknown) as ReturnType<
      typeof envalid.cleanEnv
    >);
  };

  const expectEnv = () =>
    TestUtils.expectToBeCalled(envalidMock.cleanEnv, [
      [
        process.env,
        {
          GITHUB_REPOSITORY: envalidMock.str()
        }
      ]
    ]);

  const mockInputs = () => {
    TestUtils.asMockedFunction(ActionUtilsMock.getInputAsString).mockImplementation((name) => {
      if (name === 'token') {
        return token;
      }
      if (name === 'commit.message') {
        return commitMessage;
      }

      return undefined;
    });

    TestUtils.asMockedFunction(ActionUtilsMock.getInputAsStrings).mockImplementation((name) => {
      if (name === 'paths') {
        return paths;
      }

      return undefined;
    });
  };

  const expectInputs = () => {
    expect(ActionUtilsMock.getInputAsBoolean).toBeCalledWith('delete-branch');
    expect(ActionUtilsMock.getInputAsBoolean).toBeCalledWith('commit.amend');
    expect(ActionUtilsMock.getInputAsBoolean).toBeCalledWith('pull-request');

    expect(ActionUtilsMock.getInputAsString).toBeCalledWith('token', { required: true });
    expect(ActionUtilsMock.getInputAsString).toBeCalledWith('branch');
    expect(ActionUtilsMock.getInputAsString).toBeCalledWith('commit.message');

    expect(ActionUtilsMock.getInputAsStrings).toBeCalledWith('paths', { required: true });
  };

  const expectPullRequestInputs = () => {
    expect(ActionUtilsMock.getInputAsBoolean).toBeCalledWith('pull-request.draft');

    expect(ActionUtilsMock.getInputAsInteger).toBeCalledWith('pull-request.milestone');

    expect(ActionUtilsMock.getInputAsString).toBeCalledWith('pull-request.title');
    expect(ActionUtilsMock.getInputAsString).toBeCalledWith('pull-request.body');

    expect(ActionUtilsMock.getInputAsStrings).toBeCalledWith('pull-request.labels');
    expect(ActionUtilsMock.getInputAsStrings).toBeCalledWith('pull-request.assignees');
    expect(ActionUtilsMock.getInputAsStrings).toBeCalledWith('pull-request.reviewers');
    expect(ActionUtilsMock.getInputAsStrings).toBeCalledWith('pull-request.team-reviewers');
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should run app with required args and exit with 0', async () => {
    mockEnv();
    mockInputs();

    appMock.mockResolvedValue(0);

    await main();

    expectEnv();
    expectInputs();
    expectPullRequestInputs();

    TestUtils.expectToBeCalled(appMock, [
      [
        {
          repository,
          token,
          paths,
          commit: {
            message: commitMessage
          },
          pullRequest: {}
        }
      ]
    ]);

    TestUtils.expectToBeCalled(processExitMock, [[0]]);

    expect(consoleErrorMock).not.toBeCalled();
  });

  it('should run app with required args and without pull-request and exit with 0', async () => {
    mockEnv();
    mockInputs();

    TestUtils.asMockedFunction(ActionUtilsMock.getInputAsBoolean).mockImplementation((name) => {
      if (name === 'pull-request') {
        return false;
      }

      return undefined;
    });

    appMock.mockResolvedValue(0);

    await main();

    expectEnv();
    expectInputs();

    expect(ActionUtilsMock.getInputAsBoolean).toBeCalledWith('pull-request');

    TestUtils.expectToBeCalled(appMock, [
      [
        {
          repository,
          token,
          paths,
          commit: {
            message: commitMessage
          }
        }
      ]
    ]);

    TestUtils.expectToBeCalled(processExitMock, [[0]]);

    expect(consoleErrorMock).not.toBeCalled();
  });

  it('should run app with all args and exit with 0', async () => {
    mockEnv();

    TestUtils.asMockedFunction(ActionUtilsMock.getInputAsBoolean).mockReturnValue(true);
    TestUtils.asMockedFunction(ActionUtilsMock.getInputAsInteger).mockReturnValue(42);

    TestUtils.asMockedFunction(ActionUtilsMock.getInputAsString).mockImplementation((name) => {
      if (name === 'token') {
        return token;
      }
      if (name === 'branch') {
        return branch;
      }
      if (name === 'commit.message') {
        return commitMessage;
      }
      if (name === 'commit.token') {
        return commitToken;
      }
      if (name === 'pull-request.title') {
        return pullRequest.title;
      }
      if (name === 'pull-request.body') {
        return pullRequest.body;
      }

      return undefined;
    });

    TestUtils.asMockedFunction(ActionUtilsMock.getInputAsStrings).mockImplementation((name) => {
      if (name === 'paths') {
        return paths;
      }
      if (name === 'pull-request.labels') {
        return pullRequest.labels;
      }
      if (name === 'pull-request.assignees') {
        return pullRequest.assignees;
      }
      if (name === 'pull-request.reviewers') {
        return pullRequest.reviewers;
      }
      if (name === 'pull-request.team-reviewers') {
        return pullRequest.teamReviewers;
      }

      return undefined;
    });

    appMock.mockResolvedValue(0);

    await main();

    expectEnv();
    expectInputs();
    expectPullRequestInputs();

    TestUtils.expectToBeCalled(appMock, [
      [
        {
          repository,
          token,
          paths,
          branch,
          deleteBranch: true,
          commit: {
            message: commitMessage,
            token: commitToken,
            amend: true
          },
          pullRequest
        }
      ]
    ]);

    TestUtils.expectToBeCalled(processExitMock, [[0]]);

    expect(consoleErrorMock).not.toBeCalled();
  });

  it('should print error and exit with 1 if GITHUB_REPOSITORY env is not set', async () => {
    const errorMessage = 'error-message';

    envalidMock.cleanEnv.mockImplementation(() => {
      console.error(errorMessage);
      process.exit(1);
    });

    await main();

    expectEnv();

    expect(consoleErrorMock).nthCalledWith(1, errorMessage);
    expect(processExitMock).nthCalledWith(1, 1);
  });

  it('should print error and exit with 1 if app throws an error', async () => {
    const errorMessage = 'error-message';

    mockEnv();

    appMock.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    await main();

    expectEnv();

    TestUtils.expectToBeCalled(consoleErrorMock, [[errorMessage]]);
    TestUtils.expectToBeCalled(processExitMock, [[1]]);
  });
});
