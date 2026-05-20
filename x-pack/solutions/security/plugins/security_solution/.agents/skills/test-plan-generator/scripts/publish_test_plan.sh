#!/usr/bin/env bash
#
# publish_test_plan.sh — Post or update a test plan comment on a GitHub issue.
#
# This script implements the publish step of the test-plan-generator skill
# deterministically: it locates an existing test plan comment by its hidden
# marker, then either PATCHes it or creates a new one. On success it deletes
# the local draft file so it cannot be committed by accident, and prints a
# direct link to the comment.
#
# Usage:
#   publish_test_plan.sh [--repo <owner>/<repo>] <issue_number> <draft_file>
#
# Examples:
#   publish_test_plan.sh 12345 .agents/tmp/test-plan-#12345.md
#   publish_test_plan.sh --repo elastic/kibana 12345 .agents/tmp/test-plan-#12345.md
#
# Behavior:
#   - --repo is optional. If omitted, it is derived from `gh repo view` for the
#     current working directory.
#   - The draft file MUST start with the marker `<!-- test-plan-generated -->`
#     on line 1. The agent (SKILL.md Step 4) is responsible for prepending it.
#     This script refuses to publish anything that does not carry the marker.
#   - Requires `gh` (GitHub CLI) installed and authenticated. If `gh` is not
#     available, fall back to the GitHub MCP path described in SKILL.md.
#
# Exit codes:
#   0  success
#   64 usage / argument error
#   65 draft file is malformed (missing marker)
#   66 draft file does not exist
#   69 `gh` CLI is not installed
#   70 unexpected response from GitHub API (could not resolve comment id, etc.)
#   77 `gh` CLI is not authenticated

set -euo pipefail

MARKER='<!-- test-plan-generated -->'
REPO=''

usage() {
  sed -n '2,30p' "$0"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      [[ $# -ge 2 ]] || { echo "error: --repo requires a value" >&2; exit 64; }
      REPO="$2"
      shift 2
      ;;
    --repo=*)
      REPO="${1#--repo=}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "error: unknown flag '$1'" >&2
      usage >&2
      exit 64
      ;;
    *)
      break
      ;;
  esac
done

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 64
fi

ISSUE_NUMBER="$1"
DRAFT_FILE="$2"

if [[ ! "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "error: issue_number must be numeric, got '$ISSUE_NUMBER'" >&2
  exit 64
fi

if [[ ! -f "$DRAFT_FILE" ]]; then
  echo "error: draft file not found: $DRAFT_FILE" >&2
  exit 66
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI is not installed. See https://cli.github.com/ and run 'gh auth login'." >&2
  exit 69
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh CLI is not authenticated. Run 'gh auth login'." >&2
  exit 77
fi

if [[ -z "$REPO" ]]; then
  REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)"
  if [[ -z "$REPO" ]]; then
    echo "error: could not detect repo from cwd. Pass --repo <owner>/<repo>." >&2
    exit 64
  fi
fi

# Safety net: refuse to publish a draft that does not start with the marker.
# The agent is supposed to prepend it in SKILL.md Step 4 before calling us;
# this check makes the contract explicit and protects against silent breakage.
if [[ "$(head -n1 "$DRAFT_FILE")" != "$MARKER" ]]; then
  echo "error: draft file does not start with '$MARKER' on line 1." >&2
  echo "       The agent must prepend the marker (and generated-by line) before publishing." >&2
  exit 65
fi

# Look up an existing test plan comment. We rely on the comment URL to obtain
# the numeric REST id (the .id field returned by `gh issue view` is a GraphQL
# node id and cannot be used with /repos/.../issues/comments/<id>).
EXISTING_URL="$(
  gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json comments \
    --jq "[.comments[] | select(.body | startswith(\"$MARKER\"))][0].url // empty"
)"

if [[ -n "$EXISTING_URL" ]]; then
  EXISTING_ID="${EXISTING_URL##*-}"
  if [[ ! "$EXISTING_ID" =~ ^[0-9]+$ ]]; then
    echo "error: could not parse comment id from URL '$EXISTING_URL'." >&2
    exit 70
  fi
  COMMENT_URL="$(
    gh api --method PATCH "/repos/$REPO/issues/comments/$EXISTING_ID" \
      --field "body=@$DRAFT_FILE" --jq .html_url
  )"
  ACTION='updated'
else
  COMMENT_URL="$(
    gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body-file "$DRAFT_FILE"
  )"
  ACTION='created'
fi

if [[ -z "${COMMENT_URL:-}" ]]; then
  echo "error: GitHub API returned no comment URL." >&2
  exit 70
fi

rm -f -- "$DRAFT_FILE"

echo "test plan $ACTION: $COMMENT_URL"
