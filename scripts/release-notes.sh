#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
git_cliff_command="${GIT_CLIFF_COMMAND:-git-cliff}"

if [[ "$#" -lt 1 || "$#" -gt 2 ]]; then
  printf 'usage: %s <tag> [output-file]\n' "$0" >&2
  exit 2
fi

if ! command -v "$git_cliff_command" >/dev/null 2>&1; then
  printf 'required command not found: %s\n' "$git_cliff_command" >&2
  exit 1
fi

release_tag="$1"
git rev-parse --verify --quiet "refs/tags/$release_tag" >/dev/null || {
  printf 'tag not found: %s\n' "$release_tag" >&2
  exit 1
}

previous_tag="$(git tag --sort=-version:refname | awk -v current="$release_tag" '$0 != current { print; exit }')"

args=(--config "$root_dir/cliff.toml" --tag "$release_tag" --strip all)
if [[ -n "$previous_tag" ]]; then
  args+=("$previous_tag..$release_tag")
else
  args+=(--current)
fi
if [[ "$#" == 2 ]]; then
  args+=(--output "$2")
fi

exec "$git_cliff_command" "${args[@]}"
