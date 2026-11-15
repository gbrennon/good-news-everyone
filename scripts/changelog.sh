#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
git_cliff_command="${GIT_CLIFF_COMMAND:-git-cliff}"

if ! command -v "$git_cliff_command" >/dev/null 2>&1; then
  printf 'required command not found: %s\n' "$git_cliff_command" >&2
  exit 1
fi

if [[ "$#" -gt 1 ]]; then
  printf 'usage: %s [output-file]\n' "$0" >&2
  exit 2
fi

args=(--config "$root_dir/cliff.toml")
if [[ "$#" == 1 ]]; then
  args+=(--output "$1")
fi

exec "$git_cliff_command" "${args[@]}"
