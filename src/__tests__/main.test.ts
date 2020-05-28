import envalid from 'envalid';

import { app } from '../app';
import { main } from '../main';
import { getInput } from '../utils/action-utils';
import { asMockedFunction, expectToBeCalled } from '../utils/test-utils';

const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();
const processExitMock = jest.spyOn(process, 'exit').mockImplementation();

jest.mock('envalid');
const envalidMock = {
  cleanEnv: asMockedFunction(envalid.cleanEnv),
  str: asMockedFunction(envalid.str)
};

jest.mock('../app');
const appMock = asMockedFunction(app);

jest.mock('../utils/action-utils');
const getInputMock = asMockedFunction(getInput);

describe('main', () => {
  const repository = 'github-repository';
  const token = 'token';
  const commands = 'commands';
  const paths = 'paths';

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
    expectToBeCalled(envalidMock.cleanEnv, [
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

    getInputMock
      .mockReturnValueOnce('token')
      .mockReturnValueOnce('commands')
      .mockReturnValueOnce('paths')
      .mockReturnValue(undefined);

    appMock.mockResolvedValue(0);

    await main();

    expectEnvToBeCalled();

    expect(getInputMock).toBeCalledTimes(14);
    expect(getInputMock).nthCalledWith(1, 'token', { required: true });
    expect(getInputMock).nthCalledWith(2, 'commands', { required: true });
    expect(getInputMock).nthCalledWith(3, 'paths', { required: true });
    expect(getInputMock).nthCalledWith(4, 'branch');
    expect(getInputMock).nthCalledWith(5, 'commit-message');
    expect(getInputMock).nthCalledWith(6, 'commit-token');
    expect(getInputMock).nthCalledWith(7, 'title');
    expect(getInputMock).nthCalledWith(8, 'body');
    expect(getInputMock).nthCalledWith(9, 'labels');
    expect(getInputMock).nthCalledWith(10, 'assignees');
    expect(getInputMock).nthCalledWith(11, 'reviewers');
    expect(getInputMock).nthCalledWith(12, 'team-reviewers');
    expect(getInputMock).nthCalledWith(13, 'milestone');
    expect(getInputMock).nthCalledWith(14, 'draft');

    expectToBeCalled(appMock, [
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

    expectToBeCalled(processExitMock, [[0]]);

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

    expectToBeCalled(consoleErrorMock, [[errorMessage]]);
    expectToBeCalled(processExitMock, [[1]]);
  });
});
