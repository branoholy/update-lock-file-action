"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.main = void 0;

var _child_process = require("child_process");

var _fs = require("fs");

var _dependencyManager = require("./dependency-manager");

var _fileUtils = require("./file-utils");

var _repoKit = require("./repo-kit");

const main = async ({
  owner,
  repository,
  branchName = 'update-lock-file',
  commitMessage = 'Update lock file',
  commitToken,
  pullRequestTitle = commitMessage,
  pullRequestBody = '',
  pullRequestToken = commitToken
}) => {
  try {
    const dependencyManager = (0, _dependencyManager.getDependencyManager)();

    if (!dependencyManager) {
      console.log('No lock file was found');
      return 0;
    }

    console.log(`Found ${dependencyManager.lockFilePath}`);
    (0, _fs.unlinkSync)(dependencyManager.lockFilePath);
    (0, _child_process.execSync)(dependencyManager.installCommand);

    if (!(0, _fileUtils.isFileChanged)(dependencyManager.lockFilePath)) {
      console.log('Lock file is up to date');
      return 0;
    }

    console.log('Lock file is outdated');
    const repoKit = new _repoKit.RepoKit(owner, repository, commitToken);

    if (await repoKit.hasBranch(branchName)) {
      console.log(`Branch ${branchName} already exists`);
      console.log(`Deleting branch ${branchName}...`);
      await repoKit.deleteBranch(branchName);
      console.log(`Branch ${branchName} has been deleted`);
    }

    const {
      object: {
        sha
      }
    } = await repoKit.getBranch('develop');
    await repoKit.createBranch(branchName, sha);
    console.log(`Branch ${branchName} has been created`);
    await repoKit.commitFile(dependencyManager.lockFilePath, commitMessage, branchName, 'develop');
    console.log('Updated lock file has been committed');

    if (pullRequestToken && pullRequestToken !== commitToken) {
      repoKit.setToken(pullRequestToken);
    }

    const pullRequest = await repoKit.createPullRequest(branchName, 'develop', pullRequestTitle, pullRequestBody);
    console.log(`Pull request has been created at ${pullRequest.html_url}`);
  } catch (error) {
    console.log(error);
    return 1;
  }

  return 0;
};

exports.main = main;