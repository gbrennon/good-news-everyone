#!/usr/bin/env bash
set -euo pipefail

required_version="${GIT_CLIFF_VERSION:-2.13.1}"
git_cliff_command="${GIT_CLIFF_COMMAND:-git-cliff}"

if command -v "$git_cliff_command" >/dev/null 2>&1; then
  installed_version="$($git_cliff_command --version | awk '{print $2}')"
  if [[ "$installed_version" == "$required_version" ]]; then
    exit 0
  fi
fi

if ! command -v cargo >/dev/null 2>&1; then
  printf 'git-cliff %s is required, and cargo is unavailable\n' "$required_version" >&2
  exit 1
fi

cargo install --locked --force --version "$required_version" git-cliff
