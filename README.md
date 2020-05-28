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
  commands: npm i
  paths: package-lock.json
```

### Usage with all arguments

```yaml
uses: branoholy/update-files-action
with:
  token: ${{ secrets.GITHUB_TOKEN }}
  commands: 'command-1, command-2'
  paths: 'path/to/file/a.txt, path/to/file/b.txt, path/to/file/c.txt'
  keep-files: 'path/to/file/a.txt, path/to/file/b.txt'
  branch: branch-name
  commit-message: Commit message
  commit-token: ${{ secrets.ANOTHER_TOKEN }}
  title: Pull request title
  body: Pull request body
  labels: label1, label2
  assignees: assignee1, assignee2
  reviewers: reviewer1, reviewer2
  team-reviewers: team1, team2
  milestone: 1
  draft: false
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
          commands: npm i
          paths: package-lock.json
```

## Inputs

- `token`: A token for committing the updated files and creating the pull request (required).
- `commands`: A comma-separated list of commands to generate the files specified in `paths` (required).
- `paths`: A comma-separated list of paths to delete and commit if they were changed (required).
- `keep-paths`: A comma-separated list of paths that should not be deleted (default: `''`).
- `branch`: A custom branch name (default: `'update-files'`).
- `commit-message`: A custom commit message (default: `'Update files'`).
- `commit-token`: A token that will be used to commit the files instead of `token` (default: `token`).
- `title`: A custom pull request title (default: `commit-message`).
- `body`: A custom pull request body (default: `''`).
- `labels`: A comma-separated list of labels (default: `''`).
- `assignees`: A comma-separated list of assignees (default: `''`).
- `reviewers`: A comma-separated list of reviewers (default: `''`).
- `team-reviewers`: A comma-separated list of team reviewers (default: `''`).
- `milestone`: A milestone number (default: `''`).
- `draft`: A flag to create a pull request draft or a regular pull request (default: `'false'`).
