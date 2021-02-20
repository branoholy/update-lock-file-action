const createBranchRefName = (branch: string) => `refs/heads/${branch}`;

const createCommitMessage = (sha: string) => `message-${sha}`;

const createCommitSha = (id: number) => `commit-${id}-sha`;

const getLastPartFromPath = (path: string) => {
  const pathParts = path.split('/').filter(Boolean);

  return pathParts[pathParts.length - 1];
};

const getRefNameFromPath = (path: string) => {
  const ref = getLastPartFromPath(path);

  if (!ref) {
    return null;
  }

  return `refs/${ref.replaceAll('%2F', '/')}`;
};

export const GitHubMockUtils = {
  createBranchRefName,
  createCommitMessage,
  createCommitSha,
  getLastPartFromPath,
  getRefNameFromPath
};
