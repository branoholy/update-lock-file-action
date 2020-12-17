import { execSync } from 'child_process';

const isFileChanged = (path: string) => {
  return execSync(`git diff --shortstat ${path} | wc -l`).toString().trim() === '1';
};

export const FileUtils = {
  isFileChanged
};
