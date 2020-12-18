import { Octokit } from '@octokit/rest';
import btoa from 'btoa';
import { readFileSync } from 'fs';

export interface CommitFilesArgs {
  readonly paths: string[];
  readonly message?: string;
  readonly branch: string;
  readonly amend?: boolean;
}

export interface CreatePullRequestArgs {
  readonly branch: string;
  readonly baseBranch: string;
  readonly title?: string;
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

  getRepositoryInfo() {
    return {
      owner: this.owner,
      repo: this.repositoryName
    };
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

  deleteBranch(name: string) {
    return this.octokit.git.deleteRef({
      ...this.getRepositoryInfo(),
      ref: `heads/${name}`
    });
  }

  async getDefaultBranchName() {
    const response = await this.octokit.repos.get(this.getRepositoryInfo());

    if (response.status !== 200) {
      throw new Error(`Fetch for the default branch failed with the status code ${response.status}`);
    }

    return response.data.default_branch;
  }

  async getDefaultBranch() {
    return this.getBranch(await this.getDefaultBranchName());
  }

  private async createBlobs(paths: string[]) {
    const encoding = 'base64';
    const type = 'blob' as const;
    const mode = '100644' as const;

    return Promise.all(
      paths.map(async (path) => {
        const {
          data: { sha }
        } = await this.octokit.git.createBlob({
          ...this.getRepositoryInfo(),
          content: btoa(readFileSync(path)),
          encoding
        });

        return { type, mode, path, sha };
      })
    );
  }

  private async createCommit(branchSha: string, treeSha: string, message: string | undefined, amend: boolean) {
    if (amend) {
      const { data: commit } = await this.octokit.git.getCommit({
        ...this.getRepositoryInfo(),
        commit_sha: branchSha
      });

      const { data } = await this.octokit.git.createCommit({
        ...this.getRepositoryInfo(),
        parents: commit.parents.map(({ sha }) => sha),
        tree: treeSha,
        message: message || commit.message
      });

      return data;
    } else {
      if (!message) {
        throw new Error('Commit message is empty');
      }

      const { data } = await this.octokit.git.createCommit({
        ...this.getRepositoryInfo(),
        parents: [branchSha],
        tree: treeSha,
        message
      });

      return data;
    }
  }

  async commitFiles({ paths, message, branch, amend = false }: CommitFilesArgs) {
    const treeBlobs = await this.createBlobs(paths);

    const {
      object: { sha: branchSha }
    } = await this.getBranch(branch);

    const {
      data: { sha: treeSha }
    } = await this.octokit.git.createTree({
      ...this.getRepositoryInfo(),
      tree: treeBlobs,
      base_tree: branchSha
    });

    const commit = await this.createCommit(branchSha, treeSha, message, amend);

    await this.octokit.git.updateRef({
      ...this.getRepositoryInfo(),
      ref: `heads/${branch}`,
      sha: commit.sha,
      force: amend
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
      await this.octokit.pulls.requestReviewers({
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
}
