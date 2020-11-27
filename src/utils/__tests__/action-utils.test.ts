import { getInput as actionsCoreGetInput } from '@actions/core';

import { getInput } from '../action-utils';
import { asMockedFunction } from '../test-utils';

jest.mock('@actions/core');

const actionsCoreGetInputMock = asMockedFunction(actionsCoreGetInput);

describe('getInput', () => {
  const inputName = 'name';
  const inputValue = 'value';
  const inputDefaultValue = 'defaultValue';

  beforeEach(() => {
    actionsCoreGetInputMock.mockClear();
  });

  // Typing check for (string) => string | undefined.
  it('should return the corresponding value if the input is defined and options are not set', () => {
    actionsCoreGetInputMock.mockReturnValue(inputValue);

    let output = getInput(inputName);
    expect(output).toBe(inputValue);
    expect(actionsCoreGetInputMock.mock.calls[0]?.[0]).toBe(inputName);

    output = undefined;
    output = '';
  });

  it('should return undefined if the input is not defined and options are not set', () => {
    actionsCoreGetInputMock.mockReturnValue('');

    expect(getInput(inputName)).toBeUndefined();
    expect(actionsCoreGetInputMock.mock.calls[0]?.[0]).toBe(inputName);
  });

  // Typing check for (string, {}) => string | undefined.
  it('should return the corresponding value if the input is defined and options are empty', () => {
    actionsCoreGetInputMock.mockReturnValue(inputValue);

    let output = getInput(inputName, {});
    expect(output).toBe(inputValue);
    expect(actionsCoreGetInputMock).toBeCalledWith(inputName, {});

    output = undefined;
    output = '';
  });

  it('should return undefined if the input is not defined and options are empty', () => {
    actionsCoreGetInputMock.mockReturnValue('');

    expect(getInput(inputName, {})).toBeUndefined();
    expect(actionsCoreGetInputMock).toBeCalledWith(inputName, {});
  });

  // Typing check for (string, NonRequiredInputOptions) => string | undefined.
  it('should return the corresponding value if the input is defined and not required', () => {
    actionsCoreGetInputMock.mockReturnValue(inputValue);

    let output = getInput(inputName, { required: false });
    expect(output).toBe(inputValue);
    expect(actionsCoreGetInputMock).toBeCalledWith(inputName, { required: false });

    output = undefined;
    output = '';
  });

  it('should return undefined if the input is not defined and not required', () => {
    actionsCoreGetInputMock.mockReturnValue('');

    expect(getInput(inputName, { required: false })).toBeUndefined();
    expect(actionsCoreGetInputMock).toBeCalledWith(inputName, { required: false });
  });

  // Typing check for (string, RequiredInputOptions) => string.
  it('should return the corresponding value if the input is defined and required', () => {
    actionsCoreGetInputMock.mockReturnValue(inputValue);

    expect<string>(getInput(inputName, { required: true })).toBe(inputValue);
    expect(actionsCoreGetInputMock).toBeCalledWith(inputName, { required: true });
  });

  it('should throw an error if the input is not defined but required', () => {
    actionsCoreGetInputMock.mockImplementation(() => {
      throw new Error();
    });

    const getUndefinedRequiredInput = () => getInput(inputName, { required: true });

    expect(getUndefinedRequiredInput).toThrowError();
    expect(actionsCoreGetInputMock).toBeCalledWith(inputName, { required: true });
  });

  // Typing check for (string, DefaultInputOptions) => string.
  it('should return the corresponding value if the input is defined and a default value is specified', () => {
    actionsCoreGetInputMock.mockReturnValue(inputValue);

    expect<string>(getInput(inputName, { default: inputDefaultValue })).toBe(inputValue);
    expect(actionsCoreGetInputMock.mock.calls[0]?.[0]).toBe(inputName);
    expect(actionsCoreGetInputMock.mock.calls[0]?.[1]).toMatchObject({});
  });

  it('should return the default value if the input is not defined and a default value is specified', () => {
    actionsCoreGetInputMock.mockReturnValue('');

    expect(getInput(inputName, { default: inputDefaultValue })).toBe(inputDefaultValue);
    expect(actionsCoreGetInputMock.mock.calls[0]?.[0]).toBe(inputName);
    expect(actionsCoreGetInputMock.mock.calls[0]?.[1]).toMatchObject({});
  });

  // Typing check for (string, DefaultInputOptions) => string.
  it('should return the corresponding value if the input is defined, not required, and a default value is specified', () => {
    actionsCoreGetInputMock.mockReturnValue(inputValue);

    expect<string>(getInput(inputName, { required: false, default: inputDefaultValue })).toBe(inputValue);
    expect(actionsCoreGetInputMock.mock.calls[0]?.[0]).toBe(inputName);
    expect(actionsCoreGetInputMock.mock.calls[0]?.[1]).toMatchObject({ required: false });
  });

  it('should return the default value if the input is not defined, not required, and a default value is specified', () => {
    actionsCoreGetInputMock.mockReturnValue('');

    expect(getInput(inputName, { required: false, default: inputDefaultValue })).toBe(inputDefaultValue);
    expect(actionsCoreGetInputMock.mock.calls[0]?.[0]).toBe(inputName);
    expect(actionsCoreGetInputMock.mock.calls[0]?.[1]).toMatchObject({ required: false });
  });
});
