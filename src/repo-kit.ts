import { Octokit } from '@octokit/rest';
import btoa from 'btoa';
import { readFileSync } from 'fs';

export class RepoKit {
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

  async commitFile(
    path: string,
    message: string,
    branchName?: string,
    fromBranchName = branchName,
    destinationPath = path
  ) {
    const { fileInfo } = await this.tryGetFileInfo(path, fromBranchName);
    const sha = fileInfo?.sha;

    const { data } = await this.octokit.repos.createOrUpdateFile({
      owner: this.owner,
      repo: this.repositoryName,
      branch: branchName,
      path: destinationPath,
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
