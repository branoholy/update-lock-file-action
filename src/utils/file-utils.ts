import { execSync } from 'child_process';

export const isFileChanged = (path: string) => {
  return execSync(`git diff --shortstat ${path} | wc -l`).toString().trim() === '1';
};
