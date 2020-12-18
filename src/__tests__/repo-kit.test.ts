import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';

import { RepoKit } from '../repo-kit';
import { TestUtils } from '../utils/test-utils';
import { Awaited, ExtractCallable } from '../utils/type-utils';

jest.mock('fs');
const readFileSyncMock = TestUtils.asMockedFunction(readFileSync);

type MockedOctokit = {
  git: {
    [fn in
      | 'createRef'
      | 'deleteRef'
      | 'getRef'
      | 'createBlob'
      | 'createTree'
      | 'getCommit'
      | 'createCommit'
      | 'updateRef']: jest.MockedFunction<ExtractCallable<Octokit['git'][fn]>>;
  };
  issues: {
    [fn in 'update']: jest.MockedFunction<ExtractCallable<Octokit['issues'][fn]>>;
  };
  pulls: {
    [fn in 'create' | 'requestReviewers']: jest.MockedFunction<ExtractCallable<Octokit['pulls'][fn]>>;
  };
  repos: {
    [fn in 'get']: jest.MockedFunction<ExtractCallable<Octokit['repos'][fn]>>;
  };
};

type OctokitMockType = jest.MockInstance<MockedOctokit, ConstructorParameters<typeof Octokit>> & typeof Octokit;

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(function (this: MockedOctokit) {
    this.git = {
      createRef: jest.fn(),
      deleteRef: jest.fn(),
      getRef: jest.fn(),
      createBlob: jest.fn(),
      createTree: jest.fn(),
      getCommit: jest.fn(),
      createCommit: jest.fn(),
      updateRef: jest.fn()
    };
    this.issues = {
      update: jest.fn()
    };
    this.pulls = {
      create: jest.fn(),
      requestReviewers: jest.fn()
    };
    this.repos = {
      get: jest.fn()
    };
  })
}));

const OctokitMock = Octokit as OctokitMockType;

describe('RepoKit', () => {
  const owner = 'owner';
  const repo = 'repo';
  const token = 'token';

  const repositoryInfo = { owner, repo };

  const response = {
    headers: {} as Awaited<ReturnType<Octokit['git']['createRef']>>['headers'],
    url: 'url'
  };

  const response200 = {
    ...response,
    status: 200 as const
  };

  const response201 = {
    ...response,
    status: 201 as const
  };

  const response301 = {
    ...response,
    status: 301 as const
  };

  const ref = {
    node_id: 'node_id',
    object: {
      sha: 'sha',
      type: 'type',
      url: 'url'
    },
    ref: 'ref',
    url: 'url'
  };

  const commit = {
    author: { date: 'data', email: 'email', name: 'name' },
    committer: { date: 'date', email: 'email', name: 'name' },
    html_url: 'html_url',
    message: 'message',
    node_id: 'node_id',
    parents: [],
    sha: 'commit-sha',
    tree: { sha: 'tree-sha', url: '' },
    url: 'url',
    verification: {
      // @ts-ignore Wrong typing in @octokit/rest for payload
      payload: null as string,
      reason: 'unsigned',
      // @ts-ignore Wrong typing in @octokit/rest for signature
      signature: null as string,
      verified: false
    }
  };

  let repoKit: RepoKit;

  beforeEach(() => {
    readFileSyncMock.mockClear();
    OctokitMock.mockClear();

    repoKit = new RepoKit(owner, repo, token);
  });

  describe('constructor', () => {
    it('should create Octokit with the token', () => {
      expect(OctokitMock).toBeCalledWith({ auth: token });
    });
  });

  describe('getRepositoryInfo', () => {
    it('should return repository info set in the constructor', () => {
      expect(repoKit.getRepositoryInfo()).toEqual(repositoryInfo);
    });
  });

  describe('hasBranch', () => {
    const name = 'branch';

    it('should return true if the input is an existing branch', async () => {
      const getBranchMock = jest.spyOn(repoKit, 'getBranch').mockResolvedValue({ name, ...ref });

      expect(await repoKit.hasBranch(name)).toBe(true);
      expect(getBranchMock).toBeCalledWith(name);
    });

    it('should return false if the input is a non-existing branch', async () => {
      const getBranchMock = jest.spyOn(repoKit, 'getBranch').mockImplementation(() => {
        throw new Error();
      });

      expect(await repoKit.hasBranch(name)).toBe(false);
      expect(getBranchMock).toBeCalledWith(name);
    });
  });

  describe('getBranch', () => {
    const name = 'branch';

    it('should return branch if the input is an existing branch', async () => {
      const getRefMock = OctokitMock.mock.instances[0]?.git.getRef?.mockResolvedValue({ ...response200, data: ref });

      expect(await repoKit.getBranch(name)).toEqual({ name, ...ref });
      expect(getRefMock).toBeCalledWith({ ...repositoryInfo, ref: `heads/${name}` });
    });

    it('should throw an error if the input is a non-existing branch', async () => {
      const getRefMock = OctokitMock.mock.instances[0]?.git.getRef?.mockImplementation(() => {
        throw new Error();
      });

      await expect(repoKit.getBranch(name)).rejects.toBeDefined();
      expect(getRefMock).toBeCalledWith({ ...repositoryInfo, ref: `heads/${name}` });
    });
  });

  describe('createBranch', () => {
    const name = 'branch';
    const sha = 'sha';

    it('should return the newly created branch if it was created successfully', async () => {
      const createRefMock = OctokitMock.mock.instances[0]?.git.createRef?.mockResolvedValue({
        ...response201,
        data: ref
      });

      expect(await repoKit.createBranch(name, sha)).toEqual(ref);
      expect(createRefMock).toBeCalledWith({ ...repositoryInfo, ref: `refs/heads/${name}`, sha });
    });

    it('should throw an error if it was not created successfully', async () => {
      const createRefMock = OctokitMock.mock.instances[0]?.git.createRef?.mockImplementation(() => {
        throw new Error();
      });

      await expect(repoKit.createBranch(name, sha)).rejects.toBeDefined();
      expect(createRefMock).toBeCalledWith({ ...repositoryInfo, ref: `refs/heads/${name}`, sha });
    });
  });

  describe('deleteBranch', () => {
    const name = 'branch';

    it('should call deleteRef', async () => {
      const deleteRefMock = OctokitMock.mock.instances[0]?.git.deleteRef;

      await repoKit.deleteBranch(name);
      expect(deleteRefMock).toBeCalledWith({ ...repositoryInfo, ref: `heads/${name}` });
    });
  });

  describe('getDefaultBranchName', () => {
    const name = 'default-branch';
    const message = 'Fetch for the default branch failed with the status code 301';

    it('should return the default branch name', async () => {
      const getMock = OctokitMock.mock.instances[0]?.repos.get?.mockResolvedValue({
        ...response200,
        data: { default_branch: name }
      } as Awaited<ReturnType<Octokit['repos']['get']>>);

      expect(await repoKit.getDefaultBranchName()).toEqual(name);
      expect(getMock).toBeCalledWith(repositoryInfo);
    });

    it('should throw an error if the request has status 301', async () => {
      const getMock = OctokitMock.mock.instances[0]?.repos.get;

      getMock?.mockResolvedValue((response301 as unknown) as Awaited<ReturnType<typeof getMock>>);

      await expect(repoKit.getDefaultBranch()).rejects.toMatchObject({ message });
      expect(getMock).toBeCalledWith(repositoryInfo);
    });
  });

  describe('getDefaultBranch', () => {
    const name = 'default-branch';
    const message = 'Fetch for the default branch failed with the status code 301';

    it('should return the default branch', async () => {
      const getDefaultBranchName = jest.spyOn(repoKit, 'getDefaultBranchName').mockResolvedValue(name);
      const getBranchMock = jest.spyOn(repoKit, 'getBranch').mockResolvedValue({ name, ...ref });

      expect(await repoKit.getDefaultBranch()).toEqual({ name, ...ref });
      expect(getDefaultBranchName).toBeCalled();
      expect(getBranchMock).toBeCalledWith(name);
    });

    it('should throw an error if the request has status 301', async () => {
      const getDefaultBranchName = jest.spyOn(repoKit, 'getDefaultBranchName').mockImplementation(() => {
        throw new Error(message);
      });

      await expect(repoKit.getDefaultBranch()).rejects.toMatchObject({ message });
      expect(getDefaultBranchName).toBeCalled();
    });
  });

  describe('commitFiles', () => {
    const paths = ['path1', 'path2'];
    const commitMessage = 'commit-message';
    const branch = 'branch';

    const blobs = paths.map((path) => ({ sha: `blob-${path}-sha`, url: '' }));

    const tree = { sha: 'tree-sha', tree: [], truncated: false, url: '' };

    const mockCommitMethods = () => {
      const createBlobMock = OctokitMock.mock.instances[0]?.git.createBlob;
      paths.forEach((_path, index) => {
        const blob = blobs[index];
        if (blob === undefined) {
          throw new Error(`Error: Missing blob data for index ${index}.`);
        }

        createBlobMock?.mockResolvedValueOnce({ ...response201, data: blob });
      });

      const getBranchMock = jest.spyOn(repoKit, 'getBranch').mockResolvedValue({ name: branch, ...ref });

      const createTreeMock = OctokitMock.mock.instances[0]?.git.createTree?.mockResolvedValue({
        ...response201,
        data: tree
      });

      const createCommitMock = OctokitMock.mock.instances[0]?.git.createCommit?.mockResolvedValue({
        ...response201,
        data: commit
      });

      const updateRefMock = OctokitMock.mock.instances[0]?.git.updateRef;

      return {
        createBlobMock,
        getBranchMock,
        createTreeMock,
        createCommitMock,
        updateRefMock
      };
    };

    const expectCommitMethods = ({
      createBlobMock,
      getBranchMock,
      createTreeMock
    }: Pick<ReturnType<typeof mockCommitMethods>, 'createBlobMock' | 'getBranchMock' | 'createTreeMock'>) => {
      expect(createBlobMock).toBeCalledWith({
        ...repositoryInfo,
        content: 'cmVhZEZpbGUocGF0aDEp', // base64 of "readFile(path1)"
        encoding: 'base64'
      });

      expect(createBlobMock).toBeCalledWith({
        ...repositoryInfo,
        content: 'cmVhZEZpbGUocGF0aDIp', // base64 "readFile(path2)"
        encoding: 'base64'
      });

      expect(getBranchMock).toBeCalledWith(branch);

      expect(createTreeMock).toBeCalledWith({
        ...repositoryInfo,
        base_tree: 'sha',
        tree: paths.map((path) => ({
          path,
          mode: '100644',
          sha: `blob-${path}-sha`,
          type: 'blob'
        }))
      });
    };

    beforeEach(() => {
      readFileSyncMock.mockImplementation((path) => `readFile(${path})`);
    });

    it('should call all necessary methods in the correct order', async () => {
      const { createBlobMock, getBranchMock, createTreeMock, createCommitMock, updateRefMock } = mockCommitMethods();

      expect(await repoKit.commitFiles({ paths, message: commitMessage, branch })).toBe(commit);

      expectCommitMethods({ createBlobMock, getBranchMock, createTreeMock });

      expect(createCommitMock).toBeCalledWith({
        ...repositoryInfo,
        parents: ['sha'],
        tree: tree.sha,
        message: commitMessage
      });

      expect(updateRefMock).toBeCalledWith({
        ...repositoryInfo,
        ref: `heads/${branch}`,
        sha: commit.sha,
        force: false
      });
    });

    it('should throw an error if the commit message is missing', async () => {
      const { createBlobMock, getBranchMock, createTreeMock, createCommitMock, updateRefMock } = mockCommitMethods();

      await expect(repoKit.commitFiles({ paths, branch })).rejects.toStrictEqual(new Error('Commit message is empty'));

      expectCommitMethods({ createBlobMock, getBranchMock, createTreeMock });

      expect(createCommitMock).not.toBeCalled();
      expect(updateRefMock).not.toBeCalled();
    });

    it('should call all necessary methods in the correct order for an amended commit', async () => {
      const { createBlobMock, getBranchMock, createTreeMock, createCommitMock, updateRefMock } = mockCommitMethods();

      const getCommitMock = OctokitMock.mock.instances[0]?.git.getCommit?.mockResolvedValue({
        ...response200,
        data: {
          ...commit,
          sha: 'old-commit-sha',
          parents: [{ sha: 'old-commit-parent-sha', url: 'url', html_url: 'html_url' }]
        }
      });

      expect(await repoKit.commitFiles({ paths, message: commitMessage, branch, amend: true })).toBe(commit);

      expectCommitMethods({ createBlobMock, getBranchMock, createTreeMock });

      expect(getCommitMock).toBeCalledWith({
        ...repositoryInfo,
        commit_sha: 'sha'
      });

      expect(createCommitMock).toBeCalledWith({
        ...repositoryInfo,
        parents: ['old-commit-parent-sha'],
        tree: tree.sha,
        message: commitMessage
      });

      expect(updateRefMock).toBeCalledWith({
        ...repositoryInfo,
        ref: `heads/${branch}`,
        sha: commit.sha,
        force: true
      });
    });

    it('should use old commit message if the commit message is missing for an amended commit', async () => {
      const { createBlobMock, getBranchMock, createTreeMock, createCommitMock, updateRefMock } = mockCommitMethods();

      const getCommitMock = OctokitMock.mock.instances[0]?.git.getCommit?.mockResolvedValue({
        ...response200,
        data: {
          ...commit,
          sha: 'old-commit-sha',
          parents: [{ sha: 'old-commit-parent-sha', url: 'url', html_url: 'html_url' }]
        }
      });

      expect(await repoKit.commitFiles({ paths, branch, amend: true })).toBe(commit);

      expectCommitMethods({ createBlobMock, getBranchMock, createTreeMock });

      expect(getCommitMock).toBeCalledWith({
        ...repositoryInfo,
        commit_sha: 'sha'
      });

      expect(createCommitMock).toBeCalledWith({
        ...repositoryInfo,
        parents: ['old-commit-parent-sha'],
        tree: tree.sha,
        message: commit.message
      });

      expect(updateRefMock).toBeCalledWith({
        ...repositoryInfo,
        ref: `heads/${branch}`,
        sha: commit.sha,
        force: true
      });
    });
  });

  describe('createPullRequest', () => {
    const branch = 'branch';
    const baseBranch = 'baseBranch';
    const title = 'title';
    const body = 'body';
    const labels = ['label'];
    const assignees = ['assignee'];
    const reviewers = ['reviewer'];
    const teamReviewers = ['teamReviewer'];
    const milestone = 1;
    const draft = true;

    const pullRequest = { number: 42 } as Awaited<ReturnType<Octokit['pulls']['create']>>['data'];

    it('should call all necessary methods in the correct order', async () => {
      const createMock = OctokitMock.mock.instances[0]?.pulls.create;
      const createReviewRequestMock = OctokitMock.mock.instances[0]?.pulls.requestReviewers;
      const updateMock = OctokitMock.mock.instances[0]?.issues.update;

      createMock?.mockResolvedValue({
        ...response201,
        data: pullRequest
      });

      expect(
        await repoKit.createPullRequest({
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
        })
      ).toBe(pullRequest);

      expect(createMock).toBeCalledWith({
        ...repositoryInfo,
        base: baseBranch,
        head: branch,
        title,
        body,
        draft
      });

      expect(createReviewRequestMock).toBeCalledWith({
        ...repositoryInfo,
        pull_number: pullRequest.number,
        reviewers,
        team_reviewers: teamReviewers
      });

      expect(updateMock).toBeCalledWith({
        ...repositoryInfo,
        issue_number: pullRequest.number,
        labels,
        assignees,
        milestone
      });
    });

    it('should not call requestReviewers when reviewers and team reviewers are not defined', async () => {
      const createMock = OctokitMock.mock.instances[0]?.pulls.create;
      const createReviewRequestMock = OctokitMock.mock.instances[0]?.pulls.requestReviewers;

      createMock?.mockResolvedValue({
        ...response201,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title });

      expect(createReviewRequestMock).not.toBeCalled();
    });

    it('should call requestReviewers when reviewers are defined', async () => {
      const createMock = OctokitMock.mock.instances[0]?.pulls.create;
      const createReviewRequestMock = OctokitMock.mock.instances[0]?.pulls.requestReviewers;

      createMock?.mockResolvedValue({
        ...response201,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title, reviewers });

      expect(createReviewRequestMock).toBeCalled();
    });

    it('should call requestReviewers when team reviewers are defined', async () => {
      const createMock = OctokitMock.mock.instances[0]?.pulls.create;
      const createReviewRequestMock = OctokitMock.mock.instances[0]?.pulls.requestReviewers;

      createMock?.mockResolvedValue({
        ...response201,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title, teamReviewers });

      expect(createReviewRequestMock).toBeCalled();
    });

    it('should not call update when labels and assignees and milestone are not defined', async () => {
      const createMock = OctokitMock.mock.instances[0]?.pulls.create;
      const updateMock = OctokitMock.mock.instances[0]?.issues.update;

      createMock?.mockResolvedValue({
        ...response201,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title });

      expect(updateMock).not.toBeCalled();
    });

    it('should call update when labels are defined', async () => {
      const createMock = OctokitMock.mock.instances[0]?.pulls.create;
      const updateMock = OctokitMock.mock.instances[0]?.issues.update;

      createMock?.mockResolvedValue({
        ...response201,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title, labels });

      expect(updateMock).toBeCalled();
    });

    it('should call update when assignees are defined', async () => {
      const createMock = OctokitMock.mock.instances[0]?.pulls.create;
      const updateMock = OctokitMock.mock.instances[0]?.issues.update;

      createMock?.mockResolvedValue({
        ...response201,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title, assignees });

      expect(updateMock).toBeCalled();
    });

    it('should call update when milestone is defined', async () => {
      const createMock = OctokitMock.mock.instances[0]?.pulls.create;
      const updateMock = OctokitMock.mock.instances[0]?.issues.update;

      createMock?.mockResolvedValue({
        ...response201,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title, milestone });

      expect(updateMock).toBeCalled();
    });
  });
});
