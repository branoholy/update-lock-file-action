"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.main = void 0;

var _rest = require("@octokit/rest");

var _btoa = _interopRequireDefault(require("btoa"));

var _child_process = require("child_process");

var _fs = require("fs");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Repokit {
  constructor(owner, repositoryName, token) {
    this.owner = owner;
    this.repositoryName = repositoryName;
    this.octokit = new _rest.Octokit({
      auth: token
    });
  }

  setToken(token) {
    this.octokit = new _rest.Octokit({
      auth: token
    });
  }

  async hasBranch(branchName) {
    try {
      await this.getBranch(branchName);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getBranch(branchName) {
    const {
      data
    } = await this.octokit.git.getRef({
      owner: this.owner,
      repo: this.repositoryName,
      ref: `heads/${branchName}`
    });
    return data;
  }

  async createBranch(branchName, sha) {
    const {
      data
    } = await this.octokit.git.createRef({
      owner: this.owner,
      repo: this.repositoryName,
      ref: `refs/heads/${branchName}`,
      sha
    });
    return data;
  }

  async deleteBranch(branchName) {
    await this.octokit.git.deleteRef({
      owner: this.owner,
      repo: this.repositoryName,
      ref: `heads/${branchName}`
    });
  }

  async getFileInfo(path, branchName) {
    const {
      data
    } = await this.octokit.repos.getContents({
      owner: this.owner,
      repo: this.repositoryName,
      path,
      ...(branchName ? {
        ref: `heads/${branchName}`
      } : {})
    });

    if (Array.isArray(data)) {
      throw new Error('Requested path is a directory');
    }

    return data;
  }

  async tryGetFileInfo(path, branchName) {
    try {
      const fileInfo = await this.getFileInfo(path, branchName);
      return {
        fileInfo
      };
    } catch (error) {
      return {
        error
      };
    }
  }

  async commitFile(path, message, branchName, fromBranchName = branchName) {
    const {
      fileInfo
    } = await this.tryGetFileInfo(path, fromBranchName);
    const sha = fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.sha;
    const {
      data
    } = await this.octokit.repos.createOrUpdateFile({
      owner: this.owner,
      repo: this.repositoryName,
      branch: branchName,
      path,
      sha,
      message,
      content: (0, _btoa.default)((0, _fs.readFileSync)(path))
    });
    return data;
  }

  async createPullRequest(branchName, baseBranchName, title, body) {
    const {
      data
    } = await this.octokit.pulls.create({
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

const dependencyManagers = [{
  name: 'npm',
  lockFilePath: 'package-lock.json',
  installCommand: 'npm i'
}, {
  name: 'yarn',
  lockFilePath: 'yarn.lock',
  installCommand: 'yarn'
}];

const getDependencyManager = () => {
  for (const dependencyManager of dependencyManagers) {
    if ((0, _fs.existsSync)(dependencyManager.lockFilePath)) {
      return dependencyManager;
    }
  }

  return null;
};

const isFileChanged = path => {
  return (0, _child_process.execSync)(`git diff --shortstat ${path} | wc -l`).toString().trim() === '1';
};

const main = async _args => {
  try {
    const owner = 'branoholy';
    const repository = 'test-update-lock';
    const branchName = 'update-lock-file';
    const commitMessage = 'Update lock file';
    const commitToken = 'b6abd4c28be723c9c2ba4a72bc4e21607d0bc15d';
    const pullRequestTitle = commitMessage;
    const pullRequestBody = commitMessage;
    const pullRequestToken = 'b6abd4c28be723c9c2ba4a72bc4e21607d0bc15d';
    const dependencyManager = getDependencyManager();

    if (!dependencyManager) {
      console.log('No lock file was found');
      return 0;
    }

    console.log(`Found ${dependencyManager.lockFilePath}`);
    (0, _fs.unlinkSync)(dependencyManager.lockFilePath);
    (0, _child_process.execSync)(dependencyManager.installCommand);

    if (!isFileChanged(dependencyManager.lockFilePath)) {
      console.log('Lock file is up to date');
      return 0;
    }

    console.log('Lock file is outdated');
    const repokit = new Repokit(owner, repository, commitToken);

    if (await repokit.hasBranch(branchName)) {
      console.log(`Branch ${branchName} already exists`);
      await repokit.deleteBranch(branchName);
      console.log(`Branch ${branchName} has been deleted`);
    }

    const {
      object: {
        sha
      }
    } = await repokit.getBranch('develop');
    await repokit.createBranch(branchName, sha);
    console.log(`Branch ${branchName} has been created`);
    await repokit.commitFile(dependencyManager.lockFilePath, commitMessage, branchName, 'develop');
    console.log('Updated lock file has been committed');

    if (pullRequestToken && pullRequestToken !== commitToken) {
      repokit.setToken(pullRequestToken);
    }

    const pullRequest = await repokit.createPullRequest(branchName, 'develop', pullRequestTitle, pullRequestBody);
    console.log(`Pull request has been created at`);
    console.log(JSON.stringify(pullRequest, null, 2));
  } catch (error) {
    console.log(error);
    return 1;
  }

  return 0;
};

exports.main = main;
main(process.argv.slice(2)).then(code => process.exit(code));