#!/usr/bin/env bash
#
# publish_validation_report.sh — Post or update a QA validation comment on a GitHub issue.
#
# Usage:
#   publish_validation_report.sh [--repo <owner>/<repo>] <issue_number> <draft_file>
#
# Examples:
#   publish_validation_report.sh 12345 .agents/tmp/qa-validation-#12345.md
#   publish_validation_report.sh --repo elastic/security-team 12345 .agents/tmp/qa-validation-#12345.md
#
# Exit codes:
#   0  success
#   64 usage / argument error
#   65 draft file is malformed (missing marker)
#   66 draft file does not exist
#   69 gh CLI is not installed
#   70 unexpected response from GitHub API
#   77 gh CLI is not authenticated

set -euo pipefail

MARKER='<!-- qa-ticket-validated -->'
REPO=''

usage() {
  sed -n '2,22p' "$0"
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
  echo "error: gh CLI is not installed. See https://cli.github.com/" >&2
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

if [[ "$(head -n1 "$DRAFT_FILE")" != "$MARKER" ]]; then
  echo "error: draft file does not start with '$MARKER' on line 1." >&2
  exit 65
fi

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

echo "validation report $ACTION: $COMMENT_URL"
