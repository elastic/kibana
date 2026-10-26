#!/usr/bin/env bash
#
# publish_test_plan.sh — Post or update a test plan comment on a GitHub issue.
#
# This script implements the publish step of the test-plan-generator skill
# deterministically: it writes the top markers in their canonical order,
# locates an existing test plan comment by its hidden marker, then either
# PATCHes it or creates a new one. On success it deletes the local draft file
# so it cannot be committed by accident, and prints a direct link to the
# comment.
#
# Usage:
#   publish_test_plan.sh [--repo <owner>/<repo>] [--model <id>] [--dry-run] <issue_number> <draft_file>
#
# Examples:
#   publish_test_plan.sh --model claude-sonnet-4-6 12345 .agents/tmp/test-plan-#12345.md
#   publish_test_plan.sh --repo elastic/kibana --model gpt-5 12345 .agents/tmp/test-plan-#12345.md
#
# Behavior:
#   - --repo is optional. If omitted, it is derived from `gh repo view` for the
#     current working directory.
#   - Top markers: the leading lines of the draft that are known markers are
#     replaced by this block, in this order:
#       <!-- test-plan-generated -->
#       <!-- generated-by: <model> -->
#       <!-- verbosity: <lean|standard|detailed> -->
#       <!-- tokens: input=… output=… cache_create=… cache_read=… total=… -->
#     <model> comes from --model, else from the draft's generated-by marker;
#     the script refuses to publish without one. A missing verbosity marker
#     (draft from an older skill version) becomes `standard`. The tokens
#     marker is kept only if the draft has one. The draft file is not edited.
#   - --dry-run prints the comment body that would be published and exits
#     without calling GitHub or deleting the draft.
#   - Requires `gh` (GitHub CLI) installed and authenticated. If `gh` is not
#     available, fall back to the GitHub MCP path described in SKILL.md.
#
# Exit codes:
#   0  success
#   64 usage / argument error
#   65 draft file is malformed (no model, invalid or duplicated top marker)
#   66 draft file does not exist
#   69 `gh` CLI is not installed
#   70 unexpected response from GitHub API (could not resolve comment id, etc.)
#   77 `gh` CLI is not authenticated

set -euo pipefail

MARKER='<!-- test-plan-generated -->'
REPO=''
MODEL=''
DRY_RUN='false'

usage() {
  sed -n '2,/^$/p' "$0"
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
    --model)
      [[ $# -ge 2 ]] || { echo "error: --model requires a value" >&2; exit 64; }
      MODEL="$2"
      shift 2
      ;;
    --model=*)
      MODEL="${1#--model=}"
      shift
      ;;
    --dry-run)
      DRY_RUN='true'
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

# The model id ends up inside an HTML comment, so it must not be able to close it.
MODEL_RE='^[A-Za-z0-9][A-Za-z0-9 ._:/@+()-]{0,99}$'
GENERATED_BY_RE='^<!-- generated-by: (.*) -->$'
VERBOSITY_RE='^<!-- verbosity: (.*) -->$'
TOKENS_RE='^<!-- tokens: (.*) -->$'
TOKENS_VALUE_RE='^input=[0-9]+ output=[0-9]+ cache_create=[0-9]+ cache_read=[0-9]+ total=[0-9]+$'

if [[ -n "$MODEL" && ! "$MODEL" =~ $MODEL_RE ]]; then
  echo "error: invalid --model '$MODEL'" >&2
  exit 64
fi

malformed() {
  echo "error: $1" >&2
  exit 65
}

duplicated() {
  malformed "duplicated $1 marker (remove the top markers copied from the published comment)"
}

# Read the leading block of known top markers. Blank lines between them are
# dropped; blank lines after the last one stay in the body.
HEADER_LINES=0
PENDING_BLANKS=0
SEEN_MARKER='false'
DRAFT_MODEL=''
VERBOSITY=''
TOKENS=''
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  if [[ -z "$line" ]]; then
    PENDING_BLANKS=$((PENDING_BLANKS + 1))
    continue
  fi
  if [[ "$line" == "$MARKER" ]]; then
    [[ "$SEEN_MARKER" == 'false' ]] || duplicated "'$MARKER'"
    SEEN_MARKER='true'
  elif [[ "$line" =~ $GENERATED_BY_RE ]]; then
    [[ -z "$DRAFT_MODEL" ]] || duplicated 'generated-by'
    DRAFT_MODEL="${BASH_REMATCH[1]}"
  elif [[ "$line" =~ $VERBOSITY_RE ]]; then
    [[ -z "$VERBOSITY" ]] || duplicated 'verbosity'
    VERBOSITY="${BASH_REMATCH[1]}"
    [[ "$VERBOSITY" =~ ^(lean|standard|detailed)$ ]] || malformed "invalid verbosity '$VERBOSITY'"
  elif [[ "$line" =~ $TOKENS_RE ]]; then
    [[ -z "$TOKENS" ]] || duplicated 'tokens'
    TOKENS="${BASH_REMATCH[1]}"
    [[ "$TOKENS" =~ $TOKENS_VALUE_RE ]] || malformed "invalid tokens marker '$TOKENS'"
  else
    break
  fi
  HEADER_LINES=$((HEADER_LINES + PENDING_BLANKS + 1))
  PENDING_BLANKS=0
done <"$DRAFT_FILE"

if [[ -z "$MODEL" ]]; then
  [[ -n "$DRAFT_MODEL" ]] || malformed 'no model identifier: pass --model <id> (the id written in the footer).'
  [[ "$DRAFT_MODEL" =~ $MODEL_RE ]] || malformed "invalid generated-by model '$DRAFT_MODEL'"
  MODEL="$DRAFT_MODEL"
fi

if [[ -z "$VERBOSITY" ]]; then
  echo "note: draft has no verbosity marker; publishing with '<!-- verbosity: standard -->'." >&2
  VERBOSITY='standard'
fi

PUBLISH_FILE="$(mktemp "${TMPDIR:-/tmp}/test-plan-publish.XXXXXX")"
trap 'rm -f -- "$PUBLISH_FILE"' EXIT
{
  echo "$MARKER"
  echo "<!-- generated-by: $MODEL -->"
  echo "<!-- verbosity: $VERBOSITY -->"
  if [[ -n "$TOKENS" ]]; then
    echo "<!-- tokens: $TOKENS -->"
  fi
  tail -n "+$((HEADER_LINES + 1))" -- "$DRAFT_FILE"
} >"$PUBLISH_FILE"

if [[ "$DRY_RUN" == 'true' ]]; then
  cat -- "$PUBLISH_FILE"
  exit 0
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
      --field "body=@$PUBLISH_FILE" --jq .html_url
  )"
  ACTION='updated'
else
  COMMENT_URL="$(
    gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body-file "$PUBLISH_FILE"
  )"
  ACTION='created'
fi

if [[ -z "${COMMENT_URL:-}" ]]; then
  echo "error: GitHub API returned no comment URL." >&2
  exit 70
fi

rm -f -- "$DRAFT_FILE"

echo "test plan $ACTION: $COMMENT_URL"
