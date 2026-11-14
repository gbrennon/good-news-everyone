#!/usr/bin/env bash
set -euo pipefail

usage() {
    printf 'Usage: %s <major|minor|patch> [--rc]\n' "$0" >&2
}

fail() {
    printf '%s\n' "$1" >&2
    exit 1
}

if [[ "$#" -lt 1 || "$#" -gt 2 ]]; then
    usage
    exit 1
fi

level="$1"
rc_requested=false
if [[ "$#" -eq 2 ]]; then
    [[ "$2" == '--rc' ]] || { usage; exit 1; }
    rc_requested=true
fi

case "$level" in
    major|minor|patch) ;;
    *) usage; exit 1 ;;
esac

repository_root="$(git rev-parse --show-toplevel 2>/dev/null)" || fail 'Not inside a Git repository'
cd "$repository_root"

[[ "$(git branch --show-current)" == 'main' ]] || fail 'Version bumps must start from the main branch'
[[ -z "$(git status --porcelain)" ]] || fail 'Worktree must be clean before a version bump'

current_version="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('package.json')).version)")"
version_pattern='^([0-9]+)\.([0-9]+)\.([0-9]+)(-rc\.([0-9]+))?$'
[[ "$current_version" =~ $version_pattern ]] || fail "Unsupported package version: $current_version"

major="${BASH_REMATCH[1]}"
minor="${BASH_REMATCH[2]}"
patch="${BASH_REMATCH[3]}"
rc_number="${BASH_REMATCH[5]:-}"

bump_base_version() {
    case "$level" in
        major) printf '%s.0.0' "$((major + 1))" ;;
        minor) printf '%s.%s.0' "$major" "$((minor + 1))" ;;
        patch) printf '%s.%s.%s' "$major" "$minor" "$((patch + 1))" ;;
    esac
}

if [[ -n "$rc_number" ]]; then
    if [[ "$rc_requested" == true ]]; then
        next_version="$major.$minor.$patch-rc.$((rc_number + 1))"
    else
        [[ "$level" == patch ]] || fail 'Use patch to promote an RC to stable'
        next_version="$major.$minor.$patch"
    fi
elif [[ "$rc_requested" == true ]]; then
    next_version="$(bump_base_version)-rc.1"
else
    next_version="$(bump_base_version)"
fi

branch_name="release/v$next_version"
if git show-ref --verify --quiet "refs/heads/$branch_name"; then
    fail "Release branch already exists: $branch_name"
fi
if git remote get-url origin >/dev/null 2>&1 && \
    git ls-remote --exit-code --heads origin "refs/heads/$branch_name" >/dev/null 2>&1; then
    fail "Remote release branch already exists: $branch_name"
fi

git switch -c "$branch_name"
npm version "$next_version" --no-git-tag-version --ignore-scripts
git add package.json
git commit -m "chore(release): prepare v$next_version"
printf 'Created %s with package version %s\n' "$branch_name" "$next_version"
