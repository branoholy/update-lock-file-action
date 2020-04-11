import { GitHub } from '@actions/github';
import btoa from 'btoa';
import { readFileSync } from 'fs';

export class RepoKit {
  private gitHub: GitHub;

  constructor(private owner: string, private repositoryName: string, token: string) {
    this.gitHub = new GitHub(token);
  }

  setToken(token: string) {
    this.gitHub = new GitHub(token);
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
    const { data } = await this.gitHub.git.getRef({
      owner: this.owner,
      repo: this.repositoryName,
      ref: `heads/${branchName}`
    });

    return data;
  }

  async createBranch(branchName: string, sha: string) {
    const { data } = await this.gitHub.git.createRef({
      owner: this.owner,
      repo: this.repositoryName,
      ref: `refs/heads/${branchName}`,
      sha
    });

    return data;
  }

  async deleteBranch(branchName: string) {
    await this.gitHub.git.deleteRef({
      owner: this.owner,
      repo: this.repositoryName,
      ref: `heads/${branchName}`
    });
  }

  async getFileInfo(path: string, branchName?: string) {
    const { data } = await this.gitHub.repos.getContents({
      owner: this.owner,
      repo: this.repositoryName,
      path,
      ...(branchName ? { ref: `heads/${branchName}` } : {})
    });

    if (Array.isArray(data)) {
      throw new Error('The requested path is a directory');
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

  async commitFile(
    path: string,
    commitMessage: string,
    branchName?: string,
    fromBranchName = branchName,
    destinationPath = path
  ) {
    const { fileInfo } = await this.tryGetFileInfo(path, fromBranchName);
    const sha = fileInfo?.sha;

    const { data } = await this.gitHub.repos.createOrUpdateFile({
      owner: this.owner,
      repo: this.repositoryName,
      branch: branchName,
      path: destinationPath,
      sha,
      message: commitMessage,
      content: btoa(readFileSync(path))
    });

    return data;
  }

  async createPullRequest(branchName: string, baseBranchName: string, title: string, body?: string) {
    const { data } = await this.gitHub.pulls.create({
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
