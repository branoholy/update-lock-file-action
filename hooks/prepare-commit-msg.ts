import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const branchPrefixes = ['bugfix-', 'deps-', 'docs-', 'feature-', 'refactor-', 'release-', 'repo-'];

const isRebasing = () => {
  try {
    execSync('ls `git rev-parse --git-dir` | grep rebase');
    return true;
  } catch {
    return false;
  }
};

const main = ([commitMessagePath]: string[]) => {
  if (!commitMessagePath) {
    console.error('Error: Missing commit message path.');
    return 0;
  }

  if (isRebasing()) {
    console.info('Info: No commit message prefix while rebasing.');
    return 0;
  }

  try {
    const branchName = execSync('git symbolic-ref --short HEAD').toString().trim();

    if (branchPrefixes.some((branchPrefix) => branchName.startsWith(branchPrefix))) {
      const [rawIssueType, rawIssueNumber] = branchName.split('-');
      const issueType = rawIssueType?.toUpperCase();
      const issueNumber = Number(rawIssueNumber);

      const commitMessagePrefix = Number.isInteger(issueNumber) ? `${issueType} #${issueNumber}: ` : `${issueType}: `;
      const commitMessage = readFileSync(commitMessagePath).toString();

      if (!commitMessage.startsWith(commitMessagePrefix)) {
        writeFileSync(commitMessagePath, `${commitMessagePrefix}${commitMessage}`);
      }
    }
  } catch (error) {
    console.error('Error: Cannot create commit message prefix.');
    console.error(error);
  }

  return 0;
};

process.exit(main(process.argv.slice(2)));
