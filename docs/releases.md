# Automated releases

This document describes the trusted release process for `@gbrennon/good-news-everyone`.

## Required secrets

Configure these repository secrets before opening a release pull request:

- `NPM_TOKEN`: npm publication token for `@gbrennon/good-news-everyone`.
- `GH_RELEASE_TOKEN`: GitHub token that can create releases and upload assets.

Codeberg operations use the built-in Forgejo Actions token.

## Release process

### Prepare a release branch

Create a branch named `release/vX.Y.Z` and update `package.json` to the matching version:

```bash
git switch -c release/v0.2.0
npm version 0.2.0 --no-git-tag-version
```

Commit the version change and open a pull request into `main`.

### Validate the release pull request

The release pull request workflow validates the branch name and package version. It verifies the
npm, GitHub, and Codeberg credentials. It does not publish packages, create tags, or create
releases.

The workflow checks out the trusted default branch and reads `package.json` from the pull request
commit. It does not execute actions from the pull request while release secrets are available.

### Merge and publish

After the release pull request merges:

1. Forgejo creates the matching `vX.Y.Z` tag.
2. The npm workflow runs tests, checks TypeScript, creates the npm tarball, and publishes it.
3. The Codeberg workflow creates a release and uploads the npm tarball.
4. The GitHub workflow creates a release and uploads the npm tarball.

The npm publication and forge release workflows are independent. A failure in one destination does
not silently report success for another destination.

## Release artifacts

The package is published to npm as `@gbrennon/good-news-everyone@X.Y.Z`.

The generated `gbrennon-good-news-everyone-X.Y.Z.tgz` file is attached to both Codeberg and GitHub
releases.

## Recovery

A failed release workflow must be inspected before retrying. Do not reuse a version after npm
publication or replace an existing release tag. Fix the failed destination and rerun only the
required workflow when the forge supports a safe rerun.
