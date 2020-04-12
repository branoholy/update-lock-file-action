import * as core from '@actions/core';

export interface RequiredInputOptions extends core.InputOptions {
  readonly required: true;
}

export interface NonRequiredInputOptions extends core.InputOptions {
  readonly required?: false;
}

export function getInput(name: string): string | undefined;
export function getInput(name: string, options: RequiredInputOptions): string;
export function getInput(name: string, options: NonRequiredInputOptions): string | undefined;

export function getInput(name: string, options?: core.InputOptions) {
  const input = core.getInput(name, options);

  if (!options?.required && input === '') {
    return undefined;
  }

  return input;
}
