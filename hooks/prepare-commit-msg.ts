import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const branchPrefixes = ['feature-', 'bugfix-'];

const main = ([commitMessagePath]: string[]) => {
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
