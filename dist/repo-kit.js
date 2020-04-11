"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RepoKit = void 0;

var _rest = require("@octokit/rest");

var _btoa = _interopRequireDefault(require("btoa"));

var _fs = require("fs");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class RepoKit {
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

  async commitFile(path, message, branchName, fromBranchName = branchName, destinationPath = path) {
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
      path: destinationPath,
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

exports.RepoKit = RepoKit;