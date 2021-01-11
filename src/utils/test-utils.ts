const asMockedFunction = <T extends (...args: never[]) => unknown>(fn: T) => fn as jest.MockedFunction<T>;

const asMockedClass = <T extends jest.Constructable>(cls: T) =>
  cls as jest.MockedClass<T> & {
    mock: {
      instances: jest.Mocked<InstanceType<T>>[];
    };
  };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expectToBeCalled = <T extends (...args: any[]) => unknown>(
  fn: jest.MockedFunction<T> | jest.SpiedFunction<T> | undefined,
  params: Parameters<T>[]
) => {
  params.forEach((param, index) => expect(fn).nthCalledWith(index + 1, ...param));
  expect(fn).toBeCalledTimes(params.length);
};

export const TestUtils = {
  asMockedFunction,
  asMockedClass,
  expectToBeCalled
};
