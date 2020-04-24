---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: ''
---

## Description

A clear and concise description of what the bug is.

## Your workflow

Content of your workflow file.

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

## Current behavior

A clear and concise description of what happened.

## Expected behavior

A clear and concise description of what you expected to happen.

## Screenshots

If applicable, add screenshots to help explain your problem.

## Additional context

Add any other context about the problem here.
