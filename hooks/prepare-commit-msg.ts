import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const branchPrefixes = ['feature-', 'bugfix-'];

const isRebasing = () => {
  try {
    execSync('ls `git rev-parse --git-dir` | grep rebase');
    return true;
  } catch {
    return false;
  }
};

const main = ([commitMessagePath]: string[]) => {
  if (isRebasing()) {
    console.log('No commit message prefix while rebasing.');
    return 0;
  }

  try {
    const branchName = execSync('git symbolic-ref --short HEAD').toString().trim();

    if (branchPrefixes.some((branchPrefix) => branchName.startsWith(branchPrefix))) {
      const [issueType, issueNumber] = branchName.split('-');

      const commitMessagePrefix = `${issueType.toUpperCase()} #${issueNumber}: `;
      const commitMessage = readFileSync(commitMessagePath).toString();

      if (!commitMessage.startsWith(commitMessagePrefix)) {
        writeFileSync(commitMessagePath, `${commitMessagePrefix}${commitMessage}`);
      }
    }
  } catch (error) {
    console.error('Cannot create commit message prefix.');
    console.error(error);
  }

  return 0;
};

process.exit(main(process.argv.slice(2)));
