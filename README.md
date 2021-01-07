# Update Files Action

![build](https://img.shields.io/github/workflow/status/branoholy/update-files-action/CI/develop)
![coverage](https://img.shields.io/codecov/c/github/branoholy/update-files-action/develop)

_A GitHub action for updating files._

This GitHub action can update files via custom commands and create a pull request with them.

## Usage

### Basic usage

This example updates `package-lock.json` by executing `npm i`.

```yaml
uses: branoholy/update-files-action
with:
  token: ${{ secrets.GITHUB_TOKEN }}
  commands: 'rm package-lock.json, npm i'
  paths: package-lock.json
  delete-branch: true
  commit.message: Update lock file
```

### Usage with all arguments

```yaml
uses: branoholy/update-files-action
with:
  token: ${{ secrets.GITHUB_TOKEN }}
  commands: 'command-1, command-2'
  paths: 'path/to/file/a.txt, path/to/file/b.txt, path/to/file/c.txt'
  branch: branch-name
  delete-branch: false
  commit.message: Commit message
  commit.token: ${{ secrets.ANOTHER_TOKEN }}
  commit.amend: false
  pull-request: true
  pull-request.title: Pull request title
  pull-request.body: Pull request body
  pull-request.labels: label1, label2
  pull-request.assignees: assignee1, assignee2
  pull-request.reviewers: reviewer1, reviewer2
  pull-request.team-reviewers: team1, team2
  pull-request.milestone: 1
  pull-request.draft: false
```

### Example of workflow

The following workflow runs this action to update `package-lock.json` when it was updated by something else. This happens when a new dependency is installed or updated (for example by a tool like Dependabot).

```yaml
name: Update lock file

on:
  push:
    branches: develop
    paths: package-lock.json

jobs:
  update-lock-file:
    name: Update lock file
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2.1.0
      - name: Setup Node.js
        uses: actions/setup-node@v1.4.0
        with:
          node-version: 13.12.0
      - name: Update lock file
        uses: branoholy/update-files-action
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commands: 'rm package-lock.json, npm i'
          paths: package-lock.json
          delete-branch: true
          commit.message: Update lock file
```

## Inputs

See the [action.yaml](action.yaml) file.
