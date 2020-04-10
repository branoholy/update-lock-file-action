import { Octokit } from '@octokit/rest';
import btoa from 'btoa';
import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';

class Repokit {
  private octokit: Octokit;

  constructor(private owner: string, private repositoryName: string, token?: string) {
    this.octokit = new Octokit({
      auth: token
    });
  }

  setToken(token: string) {
    this.octokit = new Octokit({
      auth: token
    });
  }

  async hasBranch(branchName: string) {
    try {
      await this.getBranch(branchName);

      return true;
    } catch (error) {
      return false;
    }
  }

  async getBranch(branchName: string) {
    const { data } = await this.octokit.git.getRef({
      owner: this.owner,
      repo: this.repositoryName,
      ref: `heads/${branchName}`
    });

    return data;
  }

  async createBranch(branchName: string, sha: string) {
    const { data } = await this.octokit.git.createRef({
      owner: this.owner,
      repo: this.repositoryName,
      ref: `refs/heads/${branchName}`,
      sha
    });

    return data;
  }

  async deleteBranch(branchName: string) {
    await this.octokit.git.deleteRef({
      owner: this.owner,
      repo: this.repositoryName,
      ref: `heads/${branchName}`
    });
  }

  async getFileInfo(path: string, branchName?: string) {
    const { data } = await this.octokit.repos.getContents({
      owner: this.owner,
      repo: this.repositoryName,
      path,
      ...(branchName ? { ref: `heads/${branchName}` } : {})
    });

    if (Array.isArray(data)) {
      throw new Error('Requested path is a directory');
    }

    return data;
  }

  async tryGetFileInfo(path: string, branchName?: string) {
    try {
      const fileInfo = await this.getFileInfo(path, branchName);

      return { fileInfo };
    } catch (error) {
      return { error };
    }
  }

  async commitFile(path: string, message: string, branchName?: string, fromBranchName = branchName) {
    const { fileInfo } = await this.tryGetFileInfo(path, fromBranchName);
    const sha = fileInfo?.sha;

    const { data } = await this.octokit.repos.createOrUpdateFile({
      owner: this.owner,
      repo: this.repositoryName,
      branch: branchName,
      path,
      sha,
      message,
      content: btoa(readFileSync(path))
    });

    return data;
  }

  async createPullRequest(branchName: string, baseBranchName: string, title: string, body?: string) {
    const { data } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repositoryName,
      base: baseBranchName,
      head: branchName,
      title,
      body
    });

    return data;
  }
}

interface DependencyManager {
  name: 'npm' | 'yarn';
  lockFilePath: 'package-lock.json' | 'yarn.lock';
  installCommand: string;
}

const dependencyManagers: DependencyManager[] = [
  {
    name: 'npm',
    lockFilePath: 'package-lock.json',
    installCommand: 'npm i'
  },
  {
    name: 'yarn',
    lockFilePath: 'yarn.lock',
    installCommand: 'yarn'
  }
];

const getDependencyManager = () => {
  for (const dependencyManager of dependencyManagers) {
    if (existsSync(dependencyManager.lockFilePath)) {
      return dependencyManager;
    }
  }

  return null;
};

const isFileChanged = (path: string) => {
  return execSync(`git diff --shortstat ${path} | wc -l`).toString().trim() === '1';
};

export const main = async (_args: string[]) => {
  try {
    const owner = 'branoholy';
    const repository = 'test-update-lock';
    const branchName = 'update-lock-file';
    const commitMessage = 'Update lock file';
    const commitToken = '';
    const pullRequestTitle = commitMessage;
    const pullRequestBody = commitMessage;
    const pullRequestToken = commitToken;

    const dependencyManager = getDependencyManager();

    if (!dependencyManager) {
      console.log('No lock file was found');
      return 0;
    }

    console.log(`Found ${dependencyManager.lockFilePath}`);

    unlinkSync(dependencyManager.lockFilePath);
    execSync(dependencyManager.installCommand);

    if (!isFileChanged(dependencyManager.lockFilePath)) {
      console.log('Lock file is up to date');
      return 0;
    }

    console.log('Lock file is outdated');

    const repokit = new Repokit(owner, repository, commitToken);

    if (await repokit.hasBranch(branchName)) {
      console.log(`Branch ${branchName} already exists`);
      console.log(`Deleting branch ${branchName}...`);
      await repokit.deleteBranch(branchName);
      console.log(`Branch ${branchName} has been deleted`);
    }

    const {
      object: { sha }
    } = await repokit.getBranch('develop');
    await repokit.createBranch(branchName, sha);
    console.log(`Branch ${branchName} has been created`);

    await repokit.commitFile(dependencyManager.lockFilePath, commitMessage, branchName, 'develop');
    console.log('Updated lock file has been committed');

    if (pullRequestToken && pullRequestToken !== commitToken) {
      repokit.setToken(pullRequestToken);
    }

    const pullRequest = await repokit.createPullRequest(branchName, 'develop', pullRequestTitle, pullRequestBody);
    console.log(`Pull request has been created at ${pullRequest.html_url}`);
  } catch (error) {
    console.log(error);
    return 1;
  }

  return 0;
};

main(process.argv.slice(2)).then((code) => process.exit(code));
