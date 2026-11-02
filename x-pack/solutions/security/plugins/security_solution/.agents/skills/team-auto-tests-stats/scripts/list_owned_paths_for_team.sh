#!/usr/bin/env bash
# Prints path prefixes for an Elastic GitHub team (one per line, deduped): CODEOWNERS matches
# merged with team_inventory_path_overrides.json (inventory-only; see team-auto-tests-stats §1).
# Requires: POSIX grep/awk/git, Node.
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

# Whole-token match only: grep -F would match @elastic/security inside @elastic/security-*.
TEAM_ESC="$(printf '%s' "$TEAM_FULL" | sed 's/[.[\*^$()+?{|]/\\&/g')"
grep -Ev '^\s*#' "$ROOT/.github/CODEOWNERS" | grep -E "(^|[[:space:]])${TEAM_ESC}([[:space:]]|$)" | awk '{ print $1 }' \
  | grep -Ev '^$' | node "$SCRIPT_DIR/merge_team_inventory_path_overrides.mjs" "$TEAM_FULL" | sort -u
