import * as ActionsCore from '@actions/core';

import { StringUtils } from './string-utils';

export interface RequiredInputOptions extends ActionsCore.InputOptions {
  readonly required: true;
}

export interface NonRequiredInputOptions extends ActionsCore.InputOptions {
  readonly required?: false;
}

export type InputOptions = RequiredInputOptions | NonRequiredInputOptions;

function getInput(name: string, options?: InputOptions) {
  const input = ActionsCore.getInput(name, options);

  if (!options?.required && input === '') {
    return undefined;
  }

  return input;
}

function getInputAsBoolean(name: string): boolean | undefined;
function getInputAsBoolean(name: string, options: RequiredInputOptions): boolean;
function getInputAsBoolean(name: string, options: NonRequiredInputOptions): boolean | undefined;

function getInputAsBoolean(name: string, options?: InputOptions): boolean | undefined {
  const input = getInput(name, options);

  if (input === 'true') {
    return true;
  }

  if (input === 'false') {
    return false;
  }

  return undefined;
}

function getInputAsInteger(name: string): number | undefined;
function getInputAsInteger(name: string, options: RequiredInputOptions): number;
function getInputAsInteger(name: string, options: NonRequiredInputOptions): number | undefined;

function getInputAsInteger(name: string, options?: InputOptions): number | undefined {
  const input = getInput(name, options);

  if (typeof input === 'string') {
    return parseInt(input, 10);
  }

  return input;
}

function getInputAsString(name: string): string | undefined;
function getInputAsString(name: string, options: RequiredInputOptions): string;
function getInputAsString(name: string, options: NonRequiredInputOptions): string | undefined;

function getInputAsString(name: string, options?: InputOptions): string | undefined {
  return getInput(name, options);
}

function getInputAsStrings(name: string): string[] | undefined;
function getInputAsStrings(name: string, options: RequiredInputOptions): string[];
function getInputAsStrings(name: string, options: NonRequiredInputOptions): string[] | undefined;

function getInputAsStrings(name: string, options?: InputOptions): string[] | undefined {
  return StringUtils.parseList(getInput(name, options));
}

export const ActionUtils = {
  getInputAsBoolean,
  getInputAsInteger,
  getInputAsString,
  getInputAsStrings
};
