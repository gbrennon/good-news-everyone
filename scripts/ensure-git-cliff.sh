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

case "$(uname -s):$(uname -m)" in
  Linux:x86_64) target="x86_64-unknown-linux-gnu" ;;
  Linux:aarch64) target="aarch64-unknown-linux-gnu" ;;
  *)
    printf 'Unsupported git-cliff runner platform: %s:%s\n' "$(uname -s)" "$(uname -m)" >&2
    exit 1
    ;;
esac

archive_name="git-cliff-$required_version-$target.tar.gz"
release_url="https://github.com/orhun/git-cliff/releases/download/v$required_version"
install_root="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/git-cliff-$required_version"
archive_path="$install_root/$archive_name"
checksum_path="$archive_path.sha512"
binary_path="$install_root/bin/git-cliff"
archive_root="$install_root/git-cliff-$required_version"

mkdir -p "$install_root/bin"
curl --fail --location --silent --show-error \
  --proto '=https' --tlsv1.2 \
  "$release_url/$archive_name" --output "$archive_path"
curl --fail --location --silent --show-error \
  --proto '=https' --tlsv1.2 \
  "$release_url/$archive_name.sha512" --output "$checksum_path"
(
  cd "$install_root"
  sha512sum --check "$archive_name.sha512"
)
tar --extract --gzip --file "$archive_path" --directory "$install_root"
install -m 0755 "$archive_root/git-cliff" "$binary_path"

if [[ -n "${GITHUB_PATH:-}" ]]; then
  printf '%s\n' "$(dirname "$binary_path")" >> "$GITHUB_PATH"
fi

"$binary_path" --version | grep -F " $required_version" >/dev/null
