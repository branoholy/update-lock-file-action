# Update Lock File Action

_An action for updating package-lock.json and yarn.lock files._

## Usage

### Basic usage

```yaml
uses: branoholy/update-lock-file-action
with:
  token: ${{ secrets.GITHUB_TOKEN }}
```

### Usage with all arguments

```yaml
uses: branoholy/update-lock-file-action
with:
  token: ${{ secrets.GITHUB_TOKEN }}
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
        uses: branoholy/update-lock-file-action
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

- `token`: A token for committing the updated lock file and creating the pull request (default: `process.env.GITHUB_TOKEN`).
- `branch`: A custom branch name (default: `'update-lock-file'`).
- `commit-message`: A custom commit message (default: `'Update lock file'`).
- `commit-token`: A token that will be used to commit the lock file instead of `token` (default: `token`).
- `title`: A custom pull request title (default: `commit-message`).
- `body`: A custom pull request body (default: `''`).
- `labels`: A comma-separated list of labels (default: `''`).
- `assignees`: A comma-separated list of assignees (default: `''`).
- `reviewers`: A comma-separated list of reviewers (default: `''`).
- `team-reviewers`: A comma-separated list of team reviewers (default: `''`).
- `milestone`: A milestone number (default: `''`).
- `draft`: A flag to create a pull request draft or a regular pull request (default: `'false'`).
