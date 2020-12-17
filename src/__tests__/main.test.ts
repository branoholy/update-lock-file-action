import envalid from 'envalid';

import { app } from '../app';
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
  const repository = 'github-repository';
  const token = 'token';
  const commands = ['command1', 'command2'];
  const paths = ['path1', 'path2'];

  const mockEnv = () => {
    envalidMock.str.mockReturnValue({
      type: 'str',
      _parse: jest.fn()
    });

    envalidMock.cleanEnv.mockReturnValue(({ GITHUB_REPOSITORY: repository } as unknown) as ReturnType<
      typeof envalid.cleanEnv
    >);
  };

  const expectEnvToBeCalled = () =>
    TestUtils.expectToBeCalled(envalidMock.cleanEnv, [
      [
        process.env,
        {
          GITHUB_REPOSITORY: envalidMock.str()
        }
      ]
    ]);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should run app with required args and exit with 0', async () => {
    mockEnv();

    TestUtils.asMockedFunction(ActionUtilsMock.getInputAsString).mockReturnValueOnce(token).mockReturnValue(undefined);

    TestUtils.asMockedFunction(ActionUtilsMock.getInputAsStrings)
      .mockReturnValueOnce(commands)
      .mockReturnValueOnce(paths)
      .mockReturnValue(undefined);

    appMock.mockResolvedValue(0);

    await main();

    expectEnvToBeCalled();

    expect(ActionUtilsMock.getInputAsBoolean).toBeCalledTimes(1);
    expect(ActionUtilsMock.getInputAsBoolean).nthCalledWith(1, 'draft');

    expect(ActionUtilsMock.getInputAsInteger).toBeCalledTimes(1);
    expect(ActionUtilsMock.getInputAsInteger).nthCalledWith(1, 'milestone');

    expect(ActionUtilsMock.getInputAsString).toBeCalledTimes(6);
    expect(ActionUtilsMock.getInputAsString).nthCalledWith(1, 'token', { required: true });
    expect(ActionUtilsMock.getInputAsString).nthCalledWith(2, 'branch');
    expect(ActionUtilsMock.getInputAsString).nthCalledWith(3, 'commit-message');
    expect(ActionUtilsMock.getInputAsString).nthCalledWith(4, 'commit-token');
    expect(ActionUtilsMock.getInputAsString).nthCalledWith(5, 'title');
    expect(ActionUtilsMock.getInputAsString).nthCalledWith(6, 'body');

    expect(ActionUtilsMock.getInputAsStrings).toBeCalledTimes(6);
    expect(ActionUtilsMock.getInputAsStrings).nthCalledWith(1, 'commands', { required: true });
    expect(ActionUtilsMock.getInputAsStrings).nthCalledWith(2, 'paths', { required: true });
    expect(ActionUtilsMock.getInputAsStrings).nthCalledWith(3, 'labels');
    expect(ActionUtilsMock.getInputAsStrings).nthCalledWith(4, 'assignees');
    expect(ActionUtilsMock.getInputAsStrings).nthCalledWith(5, 'reviewers');
    expect(ActionUtilsMock.getInputAsStrings).nthCalledWith(6, 'team-reviewers');

    TestUtils.expectToBeCalled(appMock, [
      [
        {
          repository,
          token,
          commands,
          paths,
          branch: undefined,
          commitMessage: undefined,
          commitToken: undefined,
          title: undefined,
          body: undefined,
          labels: undefined,
          assignees: undefined,
          reviewers: undefined,
          teamReviewers: undefined,
          milestone: undefined,
          draft: undefined
        }
      ]
    ]);

    TestUtils.expectToBeCalled(processExitMock, [[0]]);

    expect(consoleErrorMock).not.toBeCalled();
  });

  it('should print error and exit with 1 if GITHUB_REPOSITORY env is not set', async () => {
    envalidMock.cleanEnv.mockImplementation(() => {
      console.error('MISSING ENV');
      process.exit(1);
    });

    await main();

    expectEnvToBeCalled();

    expect(consoleErrorMock).nthCalledWith(1, 'MISSING ENV');
    expect(processExitMock).nthCalledWith(1, 1);
  });

  it('should print error and exit with 1 if app throws an error', async () => {
    const errorMessage = 'error-message';

    mockEnv();

    appMock.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    await main();

    expectEnvToBeCalled();

    TestUtils.expectToBeCalled(consoleErrorMock, [[errorMessage]]);
    TestUtils.expectToBeCalled(processExitMock, [[1]]);
  });
});
