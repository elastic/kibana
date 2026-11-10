#!/usr/bin/env bash
#
# resolve_verbosity.sh — Resolve the verbosity values for an update run.
#
# This script implements mode-update.md Step 1 (Resolve VERBOSITY_LEVEL)
# deterministically: it reads the published test plan comment, parses its
# `<!-- verbosity: … -->` marker, applies the precedence rules, and prints
# the five values the rest of update mode consumes.
#
# Usage:
#   resolve_verbosity.sh [--repo <owner>/<repo>] [--keyword <level>] <issue_number>
#   resolve_verbosity.sh [--keyword <level>] --body-file <file>
#
# Examples:
#   resolve_verbosity.sh 12345
#   resolve_verbosity.sh --repo elastic/security-team --keyword lean 12345
#
# Behavior:
#   - --keyword is INVOCATION_VERBOSITY_KEYWORD (lean, standard or detailed).
#     Omit it when the invocation has no level keyword.
#   - The published comment is the first issue comment whose body starts with
#     `<!-- test-plan-generated -->`. --body-file reads that body from a file
#     instead of GitHub (no `gh` needed).
#   - --repo is optional. If omitted, it is derived from `gh repo view`.
#
# Output (stdout, one KEY=value per line):
#   PUBLISHED_VERBOSITY_LEVEL=<lean|standard|detailed|none>
#   VERBOSITY_LEVEL=<lean|standard|detailed>
#   BASELINE_VERBOSITY_LEVEL=<lean|standard|detailed>
#   VMIG=<true|false>
#   LEVEL_CHANGED=<true|false>
#
# Exit codes:
#   0  success
#   64 usage / argument error
#   66 body file does not exist
#   67 no published test plan comment on the issue
#   69 `gh` CLI is not installed
#   77 `gh` CLI is not authenticated

set -euo pipefail

MARKER='<!-- test-plan-generated -->'
REPO=''
KEYWORD=''
BODY_FILE=''

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
    --keyword)
      [[ $# -ge 2 ]] || { echo "error: --keyword requires a value" >&2; exit 64; }
      KEYWORD="$2"
      shift 2
      ;;
    --keyword=*)
      KEYWORD="${1#--keyword=}"
      shift
      ;;
    --body-file)
      [[ $# -ge 2 ]] || { echo "error: --body-file requires a value" >&2; exit 64; }
      BODY_FILE="$2"
      shift 2
      ;;
    --body-file=*)
      BODY_FILE="${1#--body-file=}"
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

KEYWORD="$(printf '%s' "$KEYWORD" | tr '[:upper:]' '[:lower:]')"
if [[ -n "$KEYWORD" && ! "$KEYWORD" =~ ^(lean|standard|detailed)$ ]]; then
  echo "error: --keyword must be lean, standard or detailed, got '$KEYWORD'" >&2
  exit 64
fi

if [[ -n "$BODY_FILE" ]]; then
  if [[ $# -ne 0 ]]; then
    usage >&2
    exit 64
  fi
  if [[ ! -f "$BODY_FILE" ]]; then
    echo "error: body file not found: $BODY_FILE" >&2
    exit 66
  fi
  BODY="$(cat -- "$BODY_FILE")"
else
  if [[ $# -ne 1 ]]; then
    usage >&2
    exit 64
  fi
  ISSUE_NUMBER="$1"
  if [[ ! "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
    echo "error: issue_number must be numeric, got '$ISSUE_NUMBER'" >&2
    exit 64
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
  BODY="$(
    gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json comments \
      --jq "[.comments[] | select(.body | startswith(\"$MARKER\"))][0].body // empty"
  )"
fi

if [[ "$(printf '%s\n' "$BODY" | head -n1 | tr -d '\r')" != "$MARKER" ]]; then
  echo "error: no published test plan (body starting with '$MARKER') found." >&2
  exit 67
fi

PUBLISHED="$(
  printf '%s\n' "$BODY" | tr -d '\r' |
    sed -n -E 's/^<!-- verbosity: (lean|standard|detailed) -->$/\1/p' | head -n1
)"
PUBLISHED="${PUBLISHED:-none}"

if [[ -n "$KEYWORD" ]]; then
  LEVEL="$KEYWORD"
elif [[ "$PUBLISHED" != 'none' ]]; then
  LEVEL="$PUBLISHED"
else
  LEVEL='standard'
fi

# Plans published before the marker existed were rendered in today's `standard` shape.
if [[ "$PUBLISHED" == 'none' ]]; then
  BASELINE='standard'
  VMIG='true'
else
  BASELINE="$PUBLISHED"
  VMIG='false'
fi

if [[ "$LEVEL" != "$BASELINE" ]]; then
  LEVEL_CHANGED='true'
else
  LEVEL_CHANGED='false'
fi

echo "PUBLISHED_VERBOSITY_LEVEL=$PUBLISHED"
echo "VERBOSITY_LEVEL=$LEVEL"
echo "BASELINE_VERBOSITY_LEVEL=$BASELINE"
echo "VMIG=$VMIG"
echo "LEVEL_CHANGED=$LEVEL_CHANGED"
