# Update Lock File Action

_An action for updating package-lock.json and yarn.lock files._

## Usage

### Basic usage

```yaml
uses: branoholy/update-lock-file-action
with:
  github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Usage with all arguments

```yaml
uses: branoholy/update-lock-file-action
with:
  github-token: ${{ secrets.GITHUB_TOKEN }}
  branch-name: update-lock-file
  commit-message: Update lock file
  pull-request-title: Update lock file
  pull-request-body: ''
  pull-request-token: ${{ secrets.GITHUB_TOKEN }}
```

## Environment variables

- `GITHUB_TOKEN`: A token for committing the updated lock file and creating a pull request (required).
- `BRANCH_NAME`: A custom branch name (default: `'update-lock-file'`).
- `COMMIT_MESSAGE`: A custom commit message (default: `'Update lock file'`).
- `PULL_REQUEST_TITLE`: A custom pull request title (default: `COMMIT_MESSAGE`).
- `PULL_REQUEST_BODY`: A custom pull request body (default: `''`).
- `PULL_REQUEST_TOKEN`: A token that will be used to create the pull request (default: `GITHUB_TOKEN`).
