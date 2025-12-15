# Repo Lockdown

Repo Lockdown is a GitHub Action that immediately closes and locks
issues and pull requests. It is mainly used with repositories
that do not accept issues or pull requests, such as forks and mirrors.

![](assets/screenshot.png)

## Supporting the Project

The continued development of Repo Lockdown is made possible
thanks to the support of awesome backers. If you'd like to join them,
please consider contributing with
[Patreon](https://armin.dev/go/patreon?pr=repo-lockdown&src=repo),
[PayPal](https://armin.dev/go/paypal?pr=repo-lockdown&src=repo) or
[Bitcoin](https://armin.dev/go/bitcoin?pr=repo-lockdown&src=repo).

## Usage

Create the `repo-lockdown.yml` workflow file in the `.github/workflows`
directory, use one of the [example workflows](#examples) to get started.

### Inputs

The action can be configured using [input parameters](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepswith).

<!-- prettier-ignore -->
- **`github-token`**
  - GitHub access token, value must be `${{ github.token }}` or an encrypted
    secret that contains a [personal access token](#using-a-personal-access-token)
  - Optional, defaults to `${{ github.token }}`
- **`exclude-issue-created-before`**
  - Do not process issues created before a given timestamp,
    value must follow ISO 8601
  - Optional, defaults to `''`
- **`exclude-issue-labels`**
  - Do not process issues with any of these labels, value must be
    a comma separated list of labels
  - Optional, defaults to `''`
- **`issue-labels`**
  - Labels to add before closing or locking an issue, value must be
    a comma separated list of labels
  - Optional, defaults to `''`
- **`issue-comment`**
  - Comment to post before closing or locking an issue
  - Optional, defaults to `''`
- **`skip-closed-issue-comment`**
  - Do not comment on already closed issues before locking,
    value must be either `true` or `false`
  - Optional, defaults to `false`
- **`close-issue`**
  - Close issues, value must be either `true` or `false`
  - Optional, defaults to `true`
- **`issue-close-reason`**
  - Reason for closing an issue, value must be
    either `completed` or `not planned`
  - Optional, defaults to `not planned`
- **`lock-issue`**
  - Lock issues, value must be either `true` or `false`
  - Optional, defaults to `true`
- **`issue-lock-reason`**
  - Reason for locking an issue, value must be one
    of `resolved`, `off-topic`, `too heated` or `spam`
  - Optional, defaults to `''`
- **`exclude-pr-created-before`**
  - Do not process pull requests created before a given timestamp,
    value must follow ISO 8601
  - Optional, defaults to `''`
- **`exclude-pr-labels`**
  - Do not process pull requests with any of these labels, value must be
    a comma separated list of labels
  - Optional, defaults to `''`
- **`pr-labels`**
  - Labels to add before closing or locking a pull request, value must be
    a comma separated list of labels
  - Optional, defaults to `''`
- **`pr-comment`**
  - Comment to post before closing or locking a pull request
  - Optional, defaults to `''`
- **`skip-closed-pr-comment`**
  - Do not comment on already closed pull requests before locking,
    value must be either `true` or `false`
  - Optional, defaults to `false`
- **`close-pr`**
  - Close pull requests, value must be either `true` or `false`
  - Optional, defaults to `true`
- **`lock-pr`**
  - Lock pull requests, value must be either `true` or `false`
  - Optional, defaults to `true`
- **`pr-lock-reason`**
  - Reason for locking a pull request, value must be one
    of `resolved`, `off-topic`, `too heated` or `spam`
  - Optional, defaults to `''`
- **`process-only`**
  - Process only issues or pull requests, value must be
    either `issues` or `prs`
  - Optional, defaults to `''`
- **`log-output`**
  - Log output parameters, value must be either `true` or `false`
  - Optional, defaults to `false`

### Outputs

<!-- prettier-ignore -->
- **`issues`**
  - Issues that have been closed or locked, value is a JSON string in
    the form of `[{"owner": "actions", "repo": "toolkit", "issue_number": 1}]`
  - Defaults to `''`
- **`prs`**
  - Pull requests that have been closed or locked, value is a JSON string in
    the form of `[{"owner": "actions", "repo": "toolkit", "issue_number": 1}]`
  - Defaults to `''`

## Examples

The following workflow will search once an hour for existing issues
and pull requests that can be closed or locked. New issues and pull requests
will be immediately processed when they are opened.

<!-- prettier-ignore -->
```yaml
name: 'Repo Lockdown'

on:
  issues:
    types: opened
  pull_request_target:
    types: opened
  schedule:
    - cron: '0 * * * *'

permissions:
  issues: write
  pull-requests: write

jobs:
  action:
    runs-on: ubuntu-latest
    steps:
      - uses: dessant/repo-lockdown@v5
```

Scheduled runs are no longer needed once the initial backlog
of issues and pull requests has been processed. It's best to edit
the workflow after the backlog has been processed and remove
the `schedule` event to avoid unnecessary workflow runs.

<!-- prettier-ignore -->
```yaml
on:
  issues:
    types: opened
  pull_request_target:
    types: opened
```

### Available input parameters

This workflow declares all the available input parameters of the action
and their default values. Any of the parameters can be omitted.

<!-- prettier-ignore -->
```yaml
name: 'Repo Lockdown'

on:
  issues:
    types: opened
  pull_request_target:
    types: opened
  schedule:
    - cron: '0 * * * *'

permissions:
  issues: write
  pull-requests: write

jobs:
  action:
    runs-on: ubuntu-latest
    steps:
      - uses: dessant/repo-lockdown@v5
        with:
          github-token: ${{ github.token }}
          exclude-issue-created-before: ''
          exclude-issue-labels: ''
          issue-labels: ''
          issue-comment: ''
          skip-closed-issue-comment: false
          close-issue: true
          issue-close-reason: 'not planned'
          lock-issue: true
          issue-lock-reason: ''
          exclude-pr-created-before: ''
          exclude-pr-labels: ''
          pr-labels: ''
          pr-comment: ''
          skip-closed-pr-comment: false
          close-pr: true
          lock-pr: true
          pr-lock-reason: ''
          process-only: ''
          log-output: false
```

### Excluding issues and pull requests

This step will close and lock only issues, and exclude issues created
before 2018, or those with the `pinned` or `help-wanted` labels applied.

<!-- prettier-ignore -->
```yaml
    steps:
      - uses: dessant/repo-lockdown@v5
        with:
          exclude-issue-created-before: '2018-01-01T00:00:00Z'
          exclude-issue-labels: 'pinned, help-wanted'
          process-only: 'issues'
```

This step will close only pull requests, and exclude those
with the `pinned` label applied.

<!-- prettier-ignore -->
```yaml
    steps:
      - uses: dessant/repo-lockdown@v5
        with:
          exclude-pr-labels: 'pinned'
          lock-pr: false
          process-only: 'prs'
```

### Commenting and labeling

This step will post a comment on issues and pull requests before
closing and locking them, and will apply the `off-topic` label to issues.

<!-- prettier-ignore -->
```yaml
    steps:
      - uses: dessant/repo-lockdown@v5
        with:
          issue-labels: 'off-topic'
          issue-comment: >
            This repository does not accept bug reports,
            see the README for details.
          pr-comment: >
            This repository does not accept pull requests,
            see the README for details.
```

### Reducing notification spam while commenting

Informing the participants of issues and pull requests before locking
discussions can help redirect contributors to the right place
to continue their work, though it may be useful to avoid posting comments
on already closed issues and pull requests to reduce notification spam.

This step will post a comment on open issues and pull requests before
closing and locking them, and will avoid commenting on threads
that have already been closed before locking them.

<!-- prettier-ignore -->
```yaml
    steps:
      - uses: dessant/repo-lockdown@v5
        with:
          issue-comment: >
            This repository does not accept bug reports,
            see the README for details.
          skip-closed-issue-comment: true
          pr-comment: >
            This repository does not accept pull requests,
            see the README for details.
          skip-closed-pr-comment: true
```

### Using a personal access token

The action uses an installation access token by default to interact with GitHub.
You may also authenticate with a personal access token to perform actions
as a GitHub user instead of the `github-actions` app.

Create a [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic)
with the `repo` or `public_repo` scopes enabled, and add the token as a
[secret](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets#creating-secrets-for-a-repository)
for the repository or organization, then provide the action with the secret
using the `github-token` input parameter.

<!-- prettier-ignore -->
```yaml
    steps:
      - uses: dessant/repo-lockdown@v5
        with:
          github-token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

## Why are only some issues and pull requests processed?

To avoid triggering abuse prevention mechanisms on GitHub, only 50 threads
will be handled at a time. If your repository has more than that,
it will take a few hours or days to process them all.

## License

Copyright (c) 2019-2025 Armin Sebastian

This software is released under the terms of the MIT License.
See the [LICENSE](LICENSE) file for further information.
