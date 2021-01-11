import nock from 'nock';

import { GitHubMockUtils } from './github-mock-utils';
import { createGitHubRestMock, GitHubRestMocks, GitHubRestResponseData } from './github-rest-mocks';

interface Refs {
  // Key: The name of the fully qualified reference (ie: refs/heads/master).
  // Value: Commit SHA the reference points to.
  [name: string]: string;
}

interface Commit {
  sha: string;
  message: string;
  parents: { sha: string; html_url: string; url: string }[];
}

interface Commits {
  [sha: string]: Commit;
}

export class GitHubMock {
  private api = nock('https://api.github.com');

  private refs: Refs = {};

  private commitCounter = 0;
  private commits: Commits = {};

  public readonly restMocks: GitHubRestMocks = {
    any: jest.fn(),
    git: {
      createBlob: createGitHubRestMock<'git', 'createBlob'>(),

      getCommit: createGitHubRestMock<'git', 'getCommit'>(),
      createCommit: createGitHubRestMock<'git', 'createCommit'>(),

      getRef: createGitHubRestMock<'git', 'getRef'>(),
      createRef: createGitHubRestMock<'git', 'createRef'>(),
      updateRef: createGitHubRestMock<'git', 'updateRef'>(),
      deleteRef: createGitHubRestMock<'git', 'deleteRef'>(),

      createTree: createGitHubRestMock<'git', 'createTree'>()
    },
    issues: {
      update: createGitHubRestMock<'issues', 'update'>()
    },
    pulls: {
      create: createGitHubRestMock<'pulls', 'create'>(),
      requestReviewers: createGitHubRestMock<'pulls', 'requestReviewers'>()
    },
    repos: {
      getBranch: createGitHubRestMock<'repos', 'getBranch'>()
    }
  };

  public constructor(private repository: string, private defaultBranch: string) {
    this.commit(defaultBranch);
    this.mockAll();
  }

  public createBranch(branch: string, sha = this.refs[GitHubMockUtils.createBranchRefName(this.defaultBranch)]) {
    if (!sha || !(sha in this.commits)) {
      throw new Error('Commit SHA not found');
    }

    this.refs[GitHubMockUtils.createBranchRefName(branch)] = sha;
  }

  public commit(branch = this.defaultBranch) {
    const commitSha = this.createCommitSha();
    const refName = GitHubMockUtils.createBranchRefName(branch);

    const parentSha = this.refs[refName];
    const parents = parentSha ? [{ sha: parentSha, html_url: 'html_url', url: 'url' }] : [];

    this.commits[commitSha] = {
      message: GitHubMockUtils.createCommitMessage(commitSha),
      sha: commitSha,
      parents
    };

    this.refs[refName] = commitSha;
  }

  private createCommitSha() {
    return GitHubMockUtils.createCommitSha(this.commitCounter++);
  }

  private mockAll() {
    this.api.on('request', this.restMocks.any);

    this.mockGitCreateBlob();

    this.mockGitGetCommit();
    this.mockGitCreateCommit();

    this.mockGitGetRef();
    this.mockGitCreateRef();
    this.mockGitUpdateRef();
    this.mockGitDeleteRef();

    this.mockGitCreateTree();

    this.mockIssuesUpdate();

    this.mockPullsCreate();
    this.mockPullsRequestReviewers();

    this.mockReposGet();
    this.mockReposGetBranch();
  }

  private mockGitCreateBlob() {
    this.restMocks.git.createBlob.mockReturnValue([200, { sha: 'blob-sha', url: 'url' }]);

    this.api
      .post(`/repos/${this.repository}/git/blobs`)
      .optionally()
      .times(Infinity)
      // @ts-ignore
      .reply(this.restMocks.git.createBlob);
  }

  private mockGitGetCommit() {
    this.restMocks.git.getCommit.mockImplementation((uri) => {
      const sha = GitHubMockUtils.getLastPartFromPath(uri);
      if (!sha) {
        return [500];
      }

      const commit = this.commits[sha];
      if (!commit) {
        return [404];
      }

      return [200, commit as GitHubRestResponseData<'git', 'getCommit'>];
    });

    this.api
      .get((uri: string) => uri.startsWith(`/repos/${this.repository}/git/commits/`))
      .optionally()
      .times(Infinity)
      // @ts-ignore
      .reply(this.restMocks.git.getCommit);
  }

  private mockGitCreateCommit() {
    this.restMocks.git.createCommit.mockImplementation((_uri, { message, parents: parentShas = [] }) => {
      const sha = this.createCommitSha();
      const parents = parentShas.map((parentSha) => ({ sha: parentSha, html_url: 'html_url', url: 'url' }));

      this.commits[sha] = {
        sha,
        message,
        parents
      };

      if (parentShas) {
        parentShas.forEach((parentSha) => {
          const refName = Object.keys(this.refs).find((refName) => this.refs[refName] === parentSha);

          if (refName) {
            this.refs[refName] = parentSha;
          }
        });
      }

      return [
        200,
        {
          sha,
          message,
          parents
        } as GitHubRestResponseData<'git', 'createCommit'>
      ];
    });

    this.api
      .post(`/repos/${this.repository}/git/commits`)
      .optionally()
      .times(Infinity)
      // @ts-ignore
      .reply(this.restMocks.git.createCommit);
  }

  private mockGitGetRef() {
    this.restMocks.git.getRef.mockImplementation((uri) => {
      const refName = GitHubMockUtils.getRefNameFromPath(uri);
      if (!refName) {
        return [500];
      }

      const commitSha = this.refs[refName];
      if (!commitSha) {
        return [404];
      }

      return [
        200,
        {
          node_id: 'node_id',
          object: { sha: commitSha, type: 'type', url: 'url' },
          ref: refName, // TODO Is this correct?
          url: 'url'
        } as GitHubRestResponseData<'git', 'getRef'>
      ];
    });

    this.api
      .get((uri) => uri.startsWith(`/repos/${this.repository}/git/ref/`))
      .optionally()
      .times(Infinity)
      // @ts-ignore
      .reply(this.restMocks.git.getRef);
  }

  private mockGitCreateRef() {
    this.restMocks.git.createRef.mockImplementation((_uri, { ref, sha }) => {
      this.refs[ref] = sha;

      return [200];
    });

    this.api
      .post(`/repos/${this.repository}/git/refs`)
      // @ts-ignore
      .reply(this.restMocks.git.createRef);
  }

  private mockGitUpdateRef() {
    this.restMocks.git.updateRef.mockImplementation((uri, { sha /*force*/ }) => {
      const refName = GitHubMockUtils.getRefNameFromPath(uri);
      if (!refName) {
        return [500];
      }

      if (!(refName in this.refs)) {
        return [404];
      }

      this.refs[refName] = sha;
      return [200];
    });

    this.api
      .patch((uri: string) => uri.startsWith(`/repos/${this.repository}/git/refs/`))
      .optionally()
      .times(Infinity)
      // @ts-ignore
      .reply(this.restMocks.git.updateRef);
  }

  private mockGitDeleteRef() {
    this.restMocks.git.deleteRef.mockImplementation((uri) => {
      const refName = GitHubMockUtils.getRefNameFromPath(uri);
      if (!refName) {
        return [500];
      }

      if (!(refName in this.refs)) {
        return [404];
      }

      delete this.refs[refName];
      return [200];
    });

    this.api
      .delete((uri) => uri.startsWith(`/repos/${this.repository}/git/refs/`))
      .optionally()
      .times(Infinity)
      // @ts-ignore
      .reply(this.restMocks.git.deleteRef);
  }

  private mockGitCreateTree() {
    this.restMocks.git.createTree.mockReturnValue([
      200,
      {
        sha: 'tree-sha',
        tree: [],
        url: 'url',
        truncated: false
      }
    ]);

    this.api
      .post(`/repos/${this.repository}/git/trees`)
      .optionally()
      .times(Infinity)
      // @ts-ignore
      .reply(this.restMocks.git.createTree);
  }

  private mockIssuesUpdate() {
    this.api
      .patch((uri: string) => uri.startsWith(`/repos/${this.repository}/issues/`))
      .optionally()
      .times(Infinity)
      .reply(200, this.restMocks.issues.update);
  }

  private mockPullsCreate() {
    this.restMocks.pulls.create.mockReturnValue([
      200,
      {
        number: 42,
        html_url: 'html_url'
      } as GitHubRestResponseData<'pulls', 'create'>
    ]);

    this.api
      .post(`/repos/${this.repository}/pulls`)
      .optionally()
      .times(Infinity)
      // @ts-ignore
      .reply(this.restMocks.pulls.create);
  }

  private mockPullsRequestReviewers() {
    this.api
      .post(new RegExp(`^/repos/${this.repository}/pulls/\\d+/requested_reviewers$`))
      .optionally()
      .times(Infinity)
      .reply(200, this.restMocks.pulls.requestReviewers);
  }

  private mockReposGet() {
    this.api
      .get(`/repos/${this.repository}`)
      .optionally()
      .times(Infinity)
      .reply(200, {
        default_branch: this.defaultBranch
      } as GitHubRestResponseData<'repos', 'get'>);
  }

  private mockReposGetBranch() {
    this.restMocks.repos.getBranch.mockImplementation((uri) => {
      const branch = GitHubMockUtils.getLastPartFromPath(uri);
      if (!branch) {
        return [500];
      }

      const refName = GitHubMockUtils.createBranchRefName(branch);
      const commitSha = this.refs[refName];
      if (!commitSha) {
        return [404];
      }

      const commit = this.commits[commitSha];
      if (!commit) {
        return [500];
      }

      return [
        200,
        {
          commit: { commit: { message: commit.message } }
        } as GitHubRestResponseData<'repos', 'getBranch'>
      ];
    });

    this.api
      .get((uri: string) => uri.startsWith(`/repos/${this.repository}/branches/`))
      .optionally()
      .times(Infinity)
      // @ts-ignore
      .reply(this.restMocks.repos.getBranch);
  }
}
