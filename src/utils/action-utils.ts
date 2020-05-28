import * as ActionsCore from '@actions/core';

export interface RequiredInputOptions extends ActionsCore.InputOptions {
  readonly required: true;
}

export interface NonRequiredInputOptions extends ActionsCore.InputOptions {
  readonly required?: false;
}

export interface DefaultInputOptions extends NonRequiredInputOptions {
  readonly default: string;
}

export type InputOptions = RequiredInputOptions | NonRequiredInputOptions | DefaultInputOptions;

export function getInput(name: string): string | undefined;
export function getInput(name: string, options: RequiredInputOptions): string;
export function getInput(name: string, options: DefaultInputOptions): string;
export function getInput(name: string, options: NonRequiredInputOptions): string | undefined;

export function getInput(name: string, options?: InputOptions) {
  const input = ActionsCore.getInput(name, options);

  if (!options?.required && input === '') {
    if (options && 'default' in options) {
      return options.default;
    }

    return undefined;
  }

  return input;
}
