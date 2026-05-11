#!/usr/bin/env bash
# Prints CODEOWNERS path prefixes assigned to an Elastic GitHub team (one path per line, deduped).
# Requires: POSIX grep/awk/git (no dependency on rg).
# Usage (from anywhere inside the repo):
#   bash x-pack/solutions/security/plugins/security_solution/.agents/skills/team-auto-tests-stats/scripts/list_owned_paths_for_team.sh @elastic/core-analysis

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

if [[ ! -f "$ROOT/.github/CODEOWNERS" ]]; then
  echo "Missing $ROOT/.github/CODEOWNERS (not a Kibana checkout?)." >&2
  exit 1
fi

raw="${1:-}"
if [[ -z "$raw" ]]; then
  echo "Usage: $0 @elastic/<team>|<team-slug>" >&2
  exit 1
fi

if [[ "$raw" == @elastic/* ]]; then
  TEAM_FULL="$raw"
else
  TEAM_FULL="@elastic/$raw"
fi

grep -Ev '^\s*#' "$ROOT/.github/CODEOWNERS" | grep -F "$TEAM_FULL" | awk '{ print $1 }' \
  | grep -Ev '^$' | sort -u
