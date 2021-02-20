const testFilesDirectory = 'temp-e2e-test-files';

const owner = 'owner';
const repositoryName = 'repository-name';

export const E2EConstants = {
  testFilesDirectory,

  branchDefaultArg: 'update-files',

  repository: `${owner}/${repositoryName}`,
  token: 'token',

  commands: `echo cmd1 > ${testFilesDirectory}/path1, echo cmd2 > ${testFilesDirectory}/path2`,
  paths: `${testFilesDirectory}/path1, ${testFilesDirectory}/path2`,
  branch: 'branch',

  commitMessage: 'commit-message',

  pullRequestTitle: 'pull-request-title',
  pullRequestBody: 'pull-request-body',
  pullRequestLabels: 'label1, label2',
  pullRequestAssignees: 'assignee1',
  pullRequestReviewers: 'reviewer1, reviewer2, reviewer3',
  pullRequestTeamReviewers: 'teamReviewer1',
  pullRequestMilestone: '42',
  pullRequestDraft: 'true',

  defaultBranch: 'default-branch'
};
