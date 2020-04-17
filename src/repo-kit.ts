import { Octokit } from '@octokit/rest';
import btoa from 'btoa';
import { readFileSync } from 'fs';

export interface CommitFilesArgs {
  readonly paths: string[];
  readonly commitMessage: string;
  readonly branch: string;
  readonly baseBranch?: string;
}

export interface CreatePullRequestArgs {
  readonly branch: string;
  readonly baseBranch: string;
  readonly title: string;
  readonly body?: string;
  readonly labels?: string[];
  readonly assignees?: string[];
  readonly reviewers?: string[];
  readonly teamReviewers?: string[];
  readonly milestone?: number;
  readonly draft?: boolean;
}

export class RepoKit {
  private octokit: Octokit;

  constructor(private owner: string, private repositoryName: string, token: string) {
    this.octokit = new Octokit({
      auth: token
    });
  }

  withToken<T>(token: string, fn: (repoKit: RepoKit) => T | PromiseLike<T>) {
    const repoKit = new RepoKit(this.owner, this.repositoryName, token);

    return Promise.resolve(fn(repoKit));
  }

  async hasBranch(name: string) {
    try {
      await this.getBranch(name);

      return true;
    } catch (error) {
      return false;
    }
  }

  async getBranch(name: string) {
    const { data } = await this.octokit.git.getRef({
      ...this.getRepositoryInfo(),
      ref: `heads/${name}`
    });

    return {
      ...data,
      name
    };
  }

  async createBranch(name: string, sha: string) {
    const { data } = await this.octokit.git.createRef({
      ...this.getRepositoryInfo(),
      ref: `refs/heads/${name}`,
      sha
    });

    return data;
  }

  async deleteBranch(name: string) {
    await this.octokit.git.deleteRef({
      ...this.getRepositoryInfo(),
      ref: `heads/${name}`
    });
  }

  async getDefaultBranch() {
    const { data } = await this.octokit.repos.get(this.getRepositoryInfo());

    return this.getBranch(data.default_branch);
  }

  async getFileInfo(path: string, branch?: string) {
    const { data } = await this.octokit.repos.getContents({
      ...this.getRepositoryInfo(),
      path,
      ...(branch ? { ref: `heads/${branch}` } : {})
    });

    if (Array.isArray(data)) {
      throw new Error('The requested path is a directory');
    }

    return data;
  }

  async tryGetFileInfo(path: string, branch?: string) {
    try {
      const fileInfo = await this.getFileInfo(path, branch);

      return { fileInfo };
    } catch (error) {
      return { error };
    }
  }

  async commitFiles({ paths, commitMessage, branch, baseBranch = branch }: CommitFilesArgs) {
    const {
      object: { sha: baseBranchSha }
    } = await this.getBranch(baseBranch);

    const encoding = 'base64';
    const type: 'blob' = 'blob';
    const mode: '100644' = '100644';

    const treeBlobs = await Promise.all(
      paths.map(async (path) => {
        const {
          data: { sha: blobSha }
        } = await this.octokit.git.createBlob({
          ...this.getRepositoryInfo(),
          content: btoa(readFileSync(path)),
          encoding
        });

        return { type, mode, path, sha: blobSha };
      })
    );

    const {
      data: { sha: treeSha }
    } = await this.octokit.git.createTree({
      ...this.getRepositoryInfo(),
      tree: treeBlobs,
      base_tree: baseBranchSha
    });

    const { data: commit } = await this.octokit.git.createCommit({
      ...this.getRepositoryInfo(),
      parents: [baseBranchSha],
      tree: treeSha,
      message: commitMessage
    });

    await this.octokit.git.updateRef({
      ...this.getRepositoryInfo(),
      ref: `heads/${branch}`,
      sha: commit.sha
    });

    return commit;
  }

  async createPullRequest({
    branch,
    baseBranch,
    title,
    body,
    labels,
    assignees,
    reviewers,
    teamReviewers,
    milestone,
    draft
  }: CreatePullRequestArgs) {
    const { data } = await this.octokit.pulls.create({
      ...this.getRepositoryInfo(),
      base: baseBranch,
      head: branch,
      title,
      body,
      draft
    });

    if (reviewers || teamReviewers) {
      await this.octokit.pulls.createReviewRequest({
        ...this.getRepositoryInfo(),
        pull_number: data.number,
        reviewers,
        team_reviewers: teamReviewers
      });
    }

    if (labels || assignees || milestone) {
      await this.octokit.issues.update({
        ...this.getRepositoryInfo(),
        issue_number: data.number,
        labels,
        assignees,
        milestone
      });
    }

    return data;
  }

  private getRepositoryInfo() {
    return {
      owner: this.owner,
      repo: this.repositoryName
    };
  }
}
