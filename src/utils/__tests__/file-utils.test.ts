import { execSync } from 'child_process';

import { isFileChanged } from '../file-utils';
import { asMockedFunction } from '../test-utils';

jest.mock('child_process');

const execSyncMock = asMockedFunction(execSync);

describe('isFileChanged', () => {
  const path = 'path/to/file.txt';

  beforeEach(() => {
    execSyncMock.mockClear();
  });

  it('should return true if the input path is modified', () => {
    execSyncMock.mockReturnValue(Buffer.from('1\n'));

    expect(isFileChanged(path)).toBe(true);
    expect(execSyncMock).toBeCalledWith(`git diff --shortstat ${path} | wc -l`);
  });

  it('should return false if the input path is not modified', () => {
    execSyncMock.mockReturnValue(Buffer.from('0\n'));

    expect(isFileChanged(path)).toBe(false);
    expect(execSyncMock).toBeCalledWith(`git diff --shortstat ${path} | wc -l`);
  });
});
