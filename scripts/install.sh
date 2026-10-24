#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
bun_command="${BUN_COMMAND:-bun}"

if [[ "$#" -gt 1 ]]; then
  printf 'usage: %s [pi|omp]\n' "$0" >&2
  exit 2
fi

if [[ "$#" == 1 && "$1" != "pi" && "$1" != "omp" ]]; then
  printf 'unsupported agent: %s\n' "$1" >&2
  printf 'usage: %s [pi|omp]\n' "$0" >&2
  exit 2
fi

if ! command -v "$bun_command" >/dev/null 2>&1; then
  printf 'required command not found: %s\n' "$bun_command" >&2
  exit 1
fi

if [[ "$#" == 1 ]]; then
  agents=("$1")
else
  agents=(pi omp)
fi

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

for agent in "${agents[@]}"; do
  case "$agent" in
    pi)
      extension_dir="${HOME}/.pi/agent/extensions"
      ;;
    omp)
      extension_dir="${HOME}/.omp/agent/extensions"
      ;;
  esac

  mkdir -p "$extension_dir"
  "$bun_command" build "$root_dir/src/index.ts" \
    --target bun \
    --format esm \
    --outfile "$tmp_dir/good-news-everyone-hook.ts" \
    --define "process.env.PI_HOOK_AGENT=\"$agent\"" >/dev/null
  rm -f "$extension_dir/ai-toolkit-notify.ts"
  rm -f "$extension_dir/ai-toolkit-notify-hook.ts"
  rm -f "$extension_dir/gb-agent-notifications-hook.ts"
  cp "$tmp_dir/good-news-everyone-hook.ts" \
    "$extension_dir/good-news-everyone-hook.ts"
  printf 'installed Good News, Everyone! hook for %s in %s\n' \
    "$agent" "$extension_dir"
done
