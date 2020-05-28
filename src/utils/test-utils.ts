export const asMockedFunction = <T extends (...args: any[]) => unknown>(fn: T) => fn as jest.MockedFunction<T>;

export const asMockedClass = <T extends jest.Constructable>(cls: T) =>
  cls as jest.MockedClass<T> & {
    mock: {
      instances: jest.Mocked<InstanceType<T>>[];
    };
  };

export const expectToBeCalled = <T extends (...args: any[]) => unknown>(
  fn: jest.MockedFunction<T> | jest.SpiedFunction<T>,
  params: Parameters<T>[]
) => {
  expect(fn).toBeCalledTimes(params.length);
  params.forEach((param, index) => expect(fn).nthCalledWith(index + 1, ...param));
};
