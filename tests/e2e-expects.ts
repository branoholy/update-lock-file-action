import OS from 'os';

import { TestUtils } from '../src/utils/test-utils';
import { E2EConstants } from './e2e-constants';
import { E2EMocks } from './e2e-mocks';
import { GitHubMock } from './github-mock';
import { GitHubRestParameters } from './github-rest-mocks';

const branchIsCreated = (gitHubMock: GitHubMock, branch: string) => {
  TestUtils.expectToBeCalled(gitHubMock.restMocks.git.createRef, [
    [
      expect.any(String),
      expect.objectContaining<Partial<GitHubRestParameters<'git', 'createRef'>>>({
        ref: `refs/heads/${branch}`,
        sha: 'commit-0-sha'
      })
    ]
  ]);
};

const filesAreCommitted = (gitHubMock: GitHubMock, branch: string, amend = false) => {
  const oldCommitSha = amend ? 'commit-1-sha' : 'commit-0-sha';
  const newCommitSha = amend ? 'commit-2-sha' : 'commit-1-sha';

  TestUtils.expectToBeCalled(gitHubMock.restMocks.git.createBlob, [
    [
      expect.any(String),
      expect.objectContaining<Partial<GitHubRestParameters<'git', 'createBlob'>>>({
        content: 'Y21kMQo=',
        encoding: 'base64'
      })
    ],
    [
      expect.any(String),
      expect.objectContaining<Partial<GitHubRestParameters<'git', 'createBlob'>>>({
        content: 'Y21kMgo=',
        encoding: 'base64'
      })
    ]
  ]);

  expect(gitHubMock.restMocks.git.getRef).toBeCalledWith(
    expect.stringMatching(new RegExp(`/heads%2F${branch}$`)),
    expect.anything()
  );

  TestUtils.expectToBeCalled(gitHubMock.restMocks.git.createTree, [
    [
      expect.any(String),
      expect.objectContaining<Partial<GitHubRestParameters<'git', 'createTree'>>>({
        base_tree: oldCommitSha,
        tree: [
          { mode: '100644', path: `${E2EConstants.testFilesDirectory}/path1`, sha: 'blob-sha', type: 'blob' },
          { mode: '100644', path: `${E2EConstants.testFilesDirectory}/path2`, sha: 'blob-sha', type: 'blob' }
        ]
      })
    ]
  ]);

  if (amend) {
    TestUtils.expectToBeCalled(gitHubMock.restMocks.git.getCommit, [
      [expect.stringMatching(new RegExp(`/${oldCommitSha}`)), expect.anything()]
    ]);
  }

  TestUtils.expectToBeCalled(gitHubMock.restMocks.git.createCommit, [
    [
      expect.any(String),
      expect.objectContaining<Partial<GitHubRestParameters<'git', 'createCommit'>>>({
        parents: ['commit-0-sha'],
        tree: 'tree-sha',
        message: E2EConstants.commitMessage
      })
    ]
  ]);

  TestUtils.expectToBeCalled(gitHubMock.restMocks.git.updateRef, [
    [
      expect.stringMatching(new RegExp(`/heads%2F${branch}$`)),
      expect.objectContaining<Partial<GitHubRestParameters<'git', 'updateRef'>>>({
        sha: newCommitSha,
        force: amend
      })
    ]
  ]);

  TestUtils.expectToBeCalled(E2EMocks.processStdoutWrite, [[`::set-output name=commit.sha::${newCommitSha}` + OS.EOL]]);
};

const pullRequestIsCreated = (gitHubMock: GitHubMock, branch: string, full = false) => {
  if (!full) {
    TestUtils.expectToBeCalled(gitHubMock.restMocks.repos.getBranch, [
      [expect.stringMatching(new RegExp(`/${branch}$`)), expect.anything()]
    ]);
  }

  const pullsCreateArgs = full
    ? {
        title: E2EConstants.pullRequestTitle,
        body: E2EConstants.pullRequestBody,
        draft: E2EConstants.pullRequestDraft === 'true'
      }
    : {
        title: E2EConstants.commitMessage
      };

  TestUtils.expectToBeCalled(gitHubMock.restMocks.pulls.create, [
    [
      expect.any(String),
      expect.objectContaining<Partial<GitHubRestParameters<'pulls', 'create'>>>({
        head: branch,
        base: E2EConstants.defaultBranch,
        ...pullsCreateArgs
      })
    ]
  ]);

  if (full) {
    TestUtils.expectToBeCalled(gitHubMock.restMocks.pulls.requestReviewers, [
      [
        expect.stringMatching(new RegExp(`/42/requested_reviewers$`)),
        expect.objectContaining<Partial<GitHubRestParameters<'pulls', 'requestReviewers'>>>({
          reviewers: E2EConstants.pullRequestReviewers.split(',').map((reviewer) => reviewer.trim()),
          team_reviewers: E2EConstants.pullRequestTeamReviewers.split(',').map((teamReviewer) => teamReviewer.trim())
        })
      ]
    ]);

    TestUtils.expectToBeCalled(gitHubMock.restMocks.issues.update, [
      [
        expect.stringMatching(new RegExp(`/42$`)),
        expect.objectContaining<Partial<GitHubRestParameters<'issues', 'update'>>>({
          labels: E2EConstants.pullRequestLabels.split(',').map((label) => label.trim()),
          assignees: E2EConstants.pullRequestAssignees.split(',').map((assignee) => assignee.trim()),
          milestone: parseInt(E2EConstants.pullRequestMilestone, 10)
        })
      ]
    ]);
  }
};

export const E2EExpects = {
  branchIsCreated,
  filesAreCommitted,
  pullRequestIsCreated
};
