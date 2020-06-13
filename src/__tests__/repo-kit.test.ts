import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';

import { RepoKit } from '../repo-kit';
import { asMockedFunction } from '../utils/test-utils';
import { Callable, PromiseValueType } from '../utils/type-utils';

jest.mock('fs');
const readFileSyncMock = asMockedFunction(readFileSync);

type MockedOctokit = {
  git: {
    [fn in
      | 'createRef'
      | 'deleteRef'
      | 'getRef'
      | 'createBlob'
      | 'createTree'
      | 'createCommit'
      | 'updateRef']: jest.MockedFunction<Callable<Octokit['git'][fn]>>;
  };
  issues: {
    [fn in 'update']: jest.MockedFunction<Callable<Octokit['issues'][fn]>>;
  };
  pulls: {
    [fn in 'create' | 'requestReviewers']: jest.MockedFunction<Callable<Octokit['pulls'][fn]>>;
  };
  repos: {
    [fn in 'get' | 'getContent' | 'createOrUpdateFileContents']: jest.MockedFunction<Callable<Octokit['repos'][fn]>>;
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
      get: jest.fn(),
      getContent: jest.fn(),
      createOrUpdateFileContents: jest.fn()
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
    headers: {},
    status: 0,
    url: 'url'
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

  const fileContent = {
    _links: {
      git: 'git',
      html: 'html',
      self: 'self'
    },
    download_url: 'download_url',
    git_url: 'git_url',
    html_url: 'html_url',
    name: 'name',
    path: 'path',
    sha: 'sha',
    size: 0,
    type: 'type',
    url: 'url',
    encoding: 'encoding',
    content: 'content'
  };

  const directoryContent = [
    {
      _links: {
        git: 'git',
        html: 'html',
        self: 'self'
      },
      download_url: 'download_url',
      git_url: 'git_url',
      html_url: 'html_url',
      name: 'name',
      path: 'path',
      sha: 'sha',
      size: 0,
      type: 'type',
      url: 'url'
    }
  ];

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
    verification: { payload: null, reason: 'reason', signature: null, verified: false }
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

  describe('withToken', () => {
    const anotherToken = 'anotherToken';

    it('should create Octokit with another token', () => {
      repoKit.withToken(anotherToken, () => null);

      expect(OctokitMock).toBeCalledTimes(2);
      expect(OctokitMock).lastCalledWith({ auth: anotherToken });
    });

    it('should create RepoKit with the same repository info', () => {
      repoKit.withToken(anotherToken, (kit) => {
        expect(kit.getRepositoryInfo()).toEqual(repoKit.getRepositoryInfo());
      });
    });

    it('should return the callback result', () => {
      const callbackResult = 42;
      const callbackMock = jest.fn().mockReturnValue(callbackResult);

      expect(repoKit.withToken(anotherToken, callbackMock)).toBe(callbackResult);
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
      const getRefMock = OctokitMock.mock.instances[0].git.getRef;

      getRefMock.mockResolvedValue({ ...response, data: ref });

      expect(await repoKit.getBranch(name)).toEqual({ name, ...ref });
      expect(getRefMock).toBeCalledWith({ ...repositoryInfo, ref: `heads/${name}` });
    });

    it('should throw an error if the input is a non-existing branch', async () => {
      const getRefMock = OctokitMock.mock.instances[0].git.getRef;

      getRefMock.mockImplementation(() => {
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
      const createRefMock = OctokitMock.mock.instances[0].git.createRef;

      createRefMock.mockResolvedValue({ ...response, data: ref });

      expect(await repoKit.createBranch(name, sha)).toEqual(ref);
      expect(createRefMock).toBeCalledWith({ ...repositoryInfo, ref: `refs/heads/${name}`, sha });
    });

    it('should throw an error if it was not created successfully', async () => {
      const createRefMock = OctokitMock.mock.instances[0].git.createRef;

      createRefMock.mockImplementation(() => {
        throw new Error();
      });

      await expect(repoKit.createBranch(name, sha)).rejects.toBeDefined();
      expect(createRefMock).toBeCalledWith({ ...repositoryInfo, ref: `refs/heads/${name}`, sha });
    });
  });

  describe('deleteBranch', () => {
    const name = 'branch';

    it('should call deleteRef', async () => {
      const deleteRefMock = OctokitMock.mock.instances[0].git.deleteRef;

      await repoKit.deleteBranch(name);
      expect(deleteRefMock).toBeCalledWith({ ...repositoryInfo, ref: `heads/${name}` });
    });
  });

  describe('getDefaultBranch', () => {
    const name = 'default-branch';

    it('should return the default branch', async () => {
      const getMock = OctokitMock.mock.instances[0].repos.get;

      getMock.mockResolvedValue({
        ...response,
        data: { default_branch: name } as PromiseValueType<ReturnType<Octokit['repos']['get']>>['data']
      });
      const getBranchMock = jest.spyOn(repoKit, 'getBranch').mockResolvedValue({ name, ...ref });

      expect(await repoKit.getDefaultBranch()).toEqual({ name, ...ref });
      expect(getMock).toBeCalledWith(repositoryInfo);
      expect(getBranchMock).toBeCalledWith(name);
    });
  });

  describe('getFileInfo', () => {
    const path = 'path';
    const branch = 'branch';
    const message = 'The requested path is a directory';

    it('should return the file info from the default branch if the input is a file path and no branch is specified', async () => {
      const getContentsMock = OctokitMock.mock.instances[0].repos.getContent;

      getContentsMock.mockResolvedValue({
        ...response,
        data: fileContent
      });

      expect(await repoKit.getFileInfo(path)).toEqual(fileContent);
      expect(getContentsMock).toBeCalledWith({ ...repositoryInfo, path });
    });

    it('should return the file info from the specified branch if the input is a file path and a branch is specified', async () => {
      const getContentsMock = OctokitMock.mock.instances[0].repos.getContent;

      getContentsMock.mockResolvedValue({
        ...response,
        data: fileContent
      });

      expect(await repoKit.getFileInfo(path, branch)).toEqual(fileContent);
      expect(getContentsMock).toBeCalledWith({ ...repositoryInfo, path, ref: `heads/${branch}` });
    });

    it('should throw an error if the input is a directory path and no branch is specified', async () => {
      const getContentsMock = OctokitMock.mock.instances[0].repos.getContent;

      getContentsMock.mockResolvedValue({
        ...response,
        // @ts-ignore Wrong typing in @octokit/rest
        data: directoryContent
      });

      await expect(repoKit.getFileInfo(path)).rejects.toMatchObject({ message });
      expect(getContentsMock).toBeCalledWith({ ...repositoryInfo, path });
    });

    it('should throw an error if the input is a directory path and a branch is specified', async () => {
      const getContentsMock = OctokitMock.mock.instances[0].repos.getContent;

      getContentsMock.mockResolvedValue({
        ...response,
        // @ts-ignore Wrong typing in @octokit/rest
        data: directoryContent
      });

      await expect(repoKit.getFileInfo(path, branch)).rejects.toMatchObject({ message });
      expect(getContentsMock).toBeCalledWith({ ...repositoryInfo, path, ref: `heads/${branch}` });
    });
  });

  describe('tryGetFileInfo', () => {
    const path = 'path';
    const branch = 'branch';

    it('should return the file info if it was successful', async () => {
      const getFileInfoMock = jest.spyOn(repoKit, 'getFileInfo').mockResolvedValue(fileContent);

      expect(await repoKit.tryGetFileInfo(path, branch)).toEqual({ fileInfo: fileContent });
      expect(getFileInfoMock).toBeCalledWith(path, branch);
    });

    it('should return the error if it failed', async () => {
      const error = new Error('File info failed');

      const getFileInfoMock = jest.spyOn(repoKit, 'getFileInfo').mockImplementation(() => {
        throw error;
      });

      expect(await repoKit.tryGetFileInfo(path, branch)).toEqual({ error });
      expect(getFileInfoMock).toBeCalledWith(path, branch);
    });
  });

  describe('commitFile', () => {
    const path = 'path';
    const commitMessage = 'commit-message';
    const branch = 'branch';
    const baseBranch = 'base-branch';

    it('should create the file when it does not exist', async () => {
      const createOrUpdateFileMock = OctokitMock.mock.instances[0].repos.createOrUpdateFileContents;

      const tryGetFileInfoMock = jest.spyOn(repoKit, 'tryGetFileInfo').mockResolvedValue({ error: {} });
      readFileSyncMock.mockImplementation((path) => `readFile(${path})`);
      createOrUpdateFileMock.mockResolvedValue({
        ...response,
        data: {
          // @ts-ignore Wrong typing in @octokit/rest
          commit,
          content: fileContent
        }
      });

      expect(await repoKit.commitFile({ path, commitMessage, branch })).toEqual({
        commit,
        content: fileContent
      });

      expect(tryGetFileInfoMock).toBeCalledWith(path, branch);

      expect(createOrUpdateFileMock).toBeCalledWith({
        ...repositoryInfo,
        branch,
        path,
        message: commitMessage,
        content: 'cmVhZEZpbGUocGF0aCk=' // base64 of "readFile(path)"
      });
    });

    it('should create the file when it does not exist on the base branch', async () => {
      const createOrUpdateFileMock = OctokitMock.mock.instances[0].repos.createOrUpdateFileContents;

      const tryGetFileInfoMock = jest.spyOn(repoKit, 'tryGetFileInfo').mockResolvedValue({ error: {} });
      readFileSyncMock.mockImplementation((path) => `readFile(${path})`);
      createOrUpdateFileMock.mockResolvedValue({
        ...response,
        data: {
          // @ts-ignore Wrong typing in @octokit/rest
          commit,
          content: fileContent
        }
      });

      expect(await repoKit.commitFile({ path, commitMessage, branch, baseBranch })).toEqual({
        commit,
        content: fileContent
      });

      expect(tryGetFileInfoMock).toBeCalledWith(path, baseBranch);

      expect(createOrUpdateFileMock).toBeCalledWith({
        ...repositoryInfo,
        branch,
        path,
        message: commitMessage,
        content: 'cmVhZEZpbGUocGF0aCk=' // base64 of "readFile(path)"
      });
    });

    it('should update the file when it exists', async () => {
      const createOrUpdateFileMock = OctokitMock.mock.instances[0].repos.createOrUpdateFileContents;

      const tryGetFileInfoMock = jest.spyOn(repoKit, 'tryGetFileInfo').mockResolvedValue({ fileInfo: fileContent });
      readFileSyncMock.mockImplementation((path) => `readFile(${path})`);
      createOrUpdateFileMock.mockResolvedValue({
        ...response,
        data: {
          // @ts-ignore Wrong typing in @octokit/rest
          commit,
          content: fileContent
        }
      });

      expect(await repoKit.commitFile({ path, commitMessage, branch })).toEqual({
        commit,
        content: fileContent
      });

      expect(tryGetFileInfoMock).toBeCalledWith(path, branch);

      expect(createOrUpdateFileMock).toBeCalledWith({
        ...repositoryInfo,
        branch,
        path,
        sha: fileContent.sha,
        message: commitMessage,
        content: 'cmVhZEZpbGUocGF0aCk=' // base64 of "readFile(path)"
      });
    });

    it('should update the file when it exists on the base branch', async () => {
      const createOrUpdateFileMock = OctokitMock.mock.instances[0].repos.createOrUpdateFileContents;

      const tryGetFileInfoMock = jest.spyOn(repoKit, 'tryGetFileInfo').mockResolvedValue({ fileInfo: fileContent });
      readFileSyncMock.mockImplementation((path) => `readFile(${path})`);
      createOrUpdateFileMock.mockResolvedValue({
        ...response,
        data: {
          // @ts-ignore Wrong typing in @octokit/rest
          commit,
          content: fileContent
        }
      });

      expect(await repoKit.commitFile({ path, commitMessage, branch, baseBranch })).toEqual({
        commit,
        content: fileContent
      });

      expect(tryGetFileInfoMock).toBeCalledWith(path, baseBranch);

      expect(createOrUpdateFileMock).toBeCalledWith({
        ...repositoryInfo,
        branch,
        path,
        sha: fileContent.sha,
        message: commitMessage,
        content: 'cmVhZEZpbGUocGF0aCk=' // base64 of "readFile(path)"
      });
    });
  });

  describe('commitFiles', () => {
    const paths = ['path1', 'path2'];
    const commitMessage = 'commit-message';
    const branch = 'branch';
    const baseBranch = 'base-branch';

    const blobs = paths.map((path) => ({ sha: `blob-${path}-sha`, url: '' }));

    const tree = { sha: 'tree-sha', tree: [], url: '' };

    it('should call all necessary methods in the correct order', async () => {
      const createBlobMock = OctokitMock.mock.instances[0].git.createBlob;
      const createTreeMock = OctokitMock.mock.instances[0].git.createTree;
      const createCommitMock = OctokitMock.mock.instances[0].git.createCommit;
      const updateRefMock = OctokitMock.mock.instances[0].git.updateRef;

      const getBranchMock = jest.spyOn(repoKit, 'getBranch').mockResolvedValue({ name: branch, ...ref });
      readFileSyncMock.mockImplementation((path) => `readFile(${path})`);
      paths.forEach((_path, index) => createBlobMock.mockResolvedValueOnce({ ...response, data: blobs[index] }));
      createTreeMock.mockResolvedValue({ ...response, data: tree });
      createCommitMock.mockResolvedValue({
        ...response,
        // @ts-ignore Wrong typing in @octokit/rest
        data: commit
      });

      expect(await repoKit.commitFiles({ paths, commitMessage, branch })).toBe(commit);

      expect(getBranchMock).toBeCalledWith(branch);

      expect(createBlobMock).toBeCalledWith({
        ...repositoryInfo,
        content: 'cmVhZEZpbGUocGF0aDEp', // base64 of "readFile(path1)"
        encoding: 'base64'
      });

      expect(createBlobMock).toBeCalledWith({
        ...repositoryInfo,
        content: 'cmVhZEZpbGUocGF0aDIp', //  base64 "readFile(path2)"
        encoding: 'base64'
      });

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

      expect(createCommitMock).toBeCalledWith({
        ...repositoryInfo,
        parents: ['sha'],
        tree: tree.sha,
        message: commitMessage
      });

      expect(updateRefMock).toBeCalledWith({
        ...repositoryInfo,
        ref: `heads/${branch}`,
        sha: commit.sha
      });
    });

    it('should call all necessary methods in the correct order with a custom base branch', async () => {
      const createBlobMock = OctokitMock.mock.instances[0].git.createBlob;
      const createTreeMock = OctokitMock.mock.instances[0].git.createTree;
      const createCommitMock = OctokitMock.mock.instances[0].git.createCommit;
      const updateRefMock = OctokitMock.mock.instances[0].git.updateRef;

      const getBranchMock = jest.spyOn(repoKit, 'getBranch').mockResolvedValue({ name: baseBranch, ...ref });
      readFileSyncMock.mockImplementation((path) => `readFile(${path})`);
      paths.forEach((_path, index) => createBlobMock.mockResolvedValueOnce({ ...response, data: blobs[index] }));
      createTreeMock.mockResolvedValue({ ...response, data: tree });
      createCommitMock.mockResolvedValue({
        ...response,
        // @ts-ignore Wrong typing in @octokit/rest
        data: commit
      });

      expect(await repoKit.commitFiles({ paths, commitMessage, branch, baseBranch })).toBe(commit);

      expect(getBranchMock).toBeCalledWith(baseBranch);

      expect(createBlobMock).toBeCalledWith({
        ...repositoryInfo,
        content: 'cmVhZEZpbGUocGF0aDEp', // base64 of "readFile(path1)"
        encoding: 'base64'
      });

      expect(createBlobMock).toBeCalledWith({
        ...repositoryInfo,
        content: 'cmVhZEZpbGUocGF0aDIp', //  base64 "readFile(path2)"
        encoding: 'base64'
      });

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

      expect(createCommitMock).toBeCalledWith({
        ...repositoryInfo,
        parents: ['sha'],
        tree: tree.sha,
        message: commitMessage
      });

      expect(updateRefMock).toBeCalledWith({
        ...repositoryInfo,
        ref: `heads/${branch}`,
        sha: commit.sha
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

    const pullRequest = { number: 42 } as PromiseValueType<ReturnType<Octokit['pulls']['create']>>['data'];

    it('should call all necessary methods in the correct order', async () => {
      const createMock = OctokitMock.mock.instances[0].pulls.create;
      const createReviewRequestMock = OctokitMock.mock.instances[0].pulls.requestReviewers;
      const updateMock = OctokitMock.mock.instances[0].issues.update;

      createMock.mockResolvedValue({
        ...response,
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
      const createMock = OctokitMock.mock.instances[0].pulls.create;
      const createReviewRequestMock = OctokitMock.mock.instances[0].pulls.requestReviewers;

      createMock.mockResolvedValue({
        ...response,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title });

      expect(createReviewRequestMock).not.toBeCalled();
    });

    it('should call requestReviewers when reviewers are defined', async () => {
      const createMock = OctokitMock.mock.instances[0].pulls.create;
      const createReviewRequestMock = OctokitMock.mock.instances[0].pulls.requestReviewers;

      createMock.mockResolvedValue({
        ...response,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title, reviewers });

      expect(createReviewRequestMock).toBeCalled();
    });

    it('should call requestReviewers when team reviewers are defined', async () => {
      const createMock = OctokitMock.mock.instances[0].pulls.create;
      const createReviewRequestMock = OctokitMock.mock.instances[0].pulls.requestReviewers;

      createMock.mockResolvedValue({
        ...response,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title, teamReviewers });

      expect(createReviewRequestMock).toBeCalled();
    });

    it('should not call update when labels and assignees and milestone are not defined', async () => {
      const createMock = OctokitMock.mock.instances[0].pulls.create;
      const updateMock = OctokitMock.mock.instances[0].issues.update;

      createMock.mockResolvedValue({
        ...response,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title });

      expect(updateMock).not.toBeCalled();
    });

    it('should call update when labels are defined', async () => {
      const createMock = OctokitMock.mock.instances[0].pulls.create;
      const updateMock = OctokitMock.mock.instances[0].issues.update;

      createMock.mockResolvedValue({
        ...response,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title, labels });

      expect(updateMock).toBeCalled();
    });

    it('should call update when assignees are defined', async () => {
      const createMock = OctokitMock.mock.instances[0].pulls.create;
      const updateMock = OctokitMock.mock.instances[0].issues.update;

      createMock.mockResolvedValue({
        ...response,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title, assignees });

      expect(updateMock).toBeCalled();
    });

    it('should call update when milestone is defined', async () => {
      const createMock = OctokitMock.mock.instances[0].pulls.create;
      const updateMock = OctokitMock.mock.instances[0].issues.update;

      createMock.mockResolvedValue({
        ...response,
        data: pullRequest
      });

      await repoKit.createPullRequest({ branch, baseBranch, title, milestone });

      expect(updateMock).toBeCalled();
    });
  });
});
