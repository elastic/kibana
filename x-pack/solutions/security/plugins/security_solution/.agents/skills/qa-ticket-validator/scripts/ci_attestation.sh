#!/usr/bin/env bash
#
# ci_attestation.sh — Look up CI status for mapped tests on a merged PR merge commit.
#
# Usage:
#   ci_attestation.sh [--repo <owner>/<repo>] --pr <number> --tests-json <file> \
#     [--issue <number>] [--release <version>] [--plan-json <file>]
#
# Loads live.env for BUILDKITE_API_TOKEN (session path preferred; skill-dir fallback).
# Session plan path: .qa-validator-session/plan-#<issue>.json (via --issue or --plan-json).
# Writes JSON to stdout. Exit 0 when lookup completes (even if tests failed).
#
# Exit codes:
#   0  success (lookup completed)
#   64 usage / argument error
#   66 tests-json file missing
#   69 gh CLI not installed
#   70 API error / malformed response
#   77 gh not authenticated
#   78 BUILDKITE_API_TOKEN missing

set -euo pipefail

REPO='elastic/kibana'
PR_NUMBER=''
TESTS_JSON=''
CLI_RELEASE=''
PLAN_JSON=''
ISSUE_NUMBER=''
LIVE_ENV_SESSION='.qa-validator-session/live.env'
# Relative to repo root — convenience fallback when session file is absent
LIVE_ENV_SKILL='x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/live.env'

PIPELINES=(
  'kibana-pull-request'
  'kibana-on-merge'
)

usage() {
  sed -n '2,18p' "$0"
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
    --pr)
      [[ $# -ge 2 ]] || { echo "error: --pr requires a value" >&2; exit 64; }
      PR_NUMBER="$2"
      shift 2
      ;;
    --pr=*)
      PR_NUMBER="${1#--pr=}"
      shift
      ;;
    --tests-json)
      [[ $# -ge 2 ]] || { echo "error: --tests-json requires a value" >&2; exit 64; }
      TESTS_JSON="$2"
      shift 2
      ;;
    --tests-json=*)
      TESTS_JSON="${1#--tests-json=}"
      shift
      ;;
    --release)
      [[ $# -ge 2 ]] || { echo "error: --release requires a value" >&2; exit 64; }
      CLI_RELEASE="$2"
      shift 2
      ;;
    --release=*)
      CLI_RELEASE="${1#--release=}"
      shift
      ;;
    --plan-json)
      [[ $# -ge 2 ]] || { echo "error: --plan-json requires a value" >&2; exit 64; }
      PLAN_JSON="$2"
      shift 2
      ;;
    --plan-json=*)
      PLAN_JSON="${1#--plan-json=}"
      shift
      ;;
    --issue)
      [[ $# -ge 2 ]] || { echo "error: --issue requires a value" >&2; exit 64; }
      ISSUE_NUMBER="$2"
      shift 2
      ;;
    --issue=*)
      ISSUE_NUMBER="${1#--issue=}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument '$1'" >&2
      usage >&2
      exit 64
      ;;
  esac
done

if [[ -z "$PR_NUMBER" || -z "$TESTS_JSON" ]]; then
  usage >&2
  exit 64
fi

if [[ ! "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "error: --pr must be numeric" >&2
  exit 64
fi

if [[ ! -f "$TESTS_JSON" ]]; then
  echo "error: tests-json file not found: $TESTS_JSON" >&2
  exit 66
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI is not installed" >&2
  exit 69
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh CLI is not authenticated" >&2
  exit 77
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 70
fi

# Locate repo root and load live.env (session preferred, skill-dir fallback)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || pwd)"

LIVE_ENV_PATH=''
LIVE_ENV_SOURCE=''
if [[ -f "$REPO_ROOT/$LIVE_ENV_SESSION" ]]; then
  LIVE_ENV_PATH="$REPO_ROOT/$LIVE_ENV_SESSION"
  LIVE_ENV_SOURCE='session'
elif [[ -f "$REPO_ROOT/$LIVE_ENV_SKILL" ]]; then
  LIVE_ENV_PATH="$REPO_ROOT/$LIVE_ENV_SKILL"
  LIVE_ENV_SOURCE='skill'
fi

# shellcheck disable=SC1091
source "$SCRIPT_DIR/resolve_target_release.sh"

if [[ -n "$LIVE_ENV_PATH" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$LIVE_ENV_PATH"
  set +a
fi

BUILDKITE_ORGANIZATION_SLUG="${BUILDKITE_ORGANIZATION_SLUG:-elastic}"

if [[ -z "${BUILDKITE_API_TOKEN:-}" ]]; then
  echo "error: BUILDKITE_API_TOKEN is not set (configure $LIVE_ENV_SESSION or skill-dir live.env)" >&2
  exit 78
fi

export BUILDKITE_API_TOKEN
export BUILDKITE_ORGANIZATION_SLUG

GH_PAGER=cat gh pr view "$PR_NUMBER" --repo "$REPO" \
  --json mergeCommit,labels,headRepository \
  > /tmp/qa-ci-pr-$$.json

MERGE_SHA="$(jq -r '.mergeCommit.oid // empty' /tmp/qa-ci-pr-$$.json)"
if [[ -z "$MERGE_SHA" ]]; then
  rm -f /tmp/qa-ci-pr-$$.json
  echo "error: PR #$PR_NUMBER is not merged or merge commit unavailable" >&2
  exit 70
fi

# PR backport labels — context only, never used for target_release
BACKPORT_LABELS="$(jq -c '
  [.labels[].name | select(test("^v[0-9]+\\.[0-9]+"))]
  | map(sub("^v"; ""))
' /tmp/qa-ci-pr-$$.json)"

if [[ -z "$PLAN_JSON" ]]; then
  if [[ -n "$ISSUE_NUMBER" && -f "$REPO_ROOT/.qa-validator-session/plan-#${ISSUE_NUMBER}.json" ]]; then
    PLAN_JSON="$REPO_ROOT/.qa-validator-session/plan-#${ISSUE_NUMBER}.json"
  elif [[ -f "$REPO_ROOT/.qa-validator-session/plan.json" ]]; then
    # Legacy single-session filename — prefer plan-#N.json for multi-ticket runs
    PLAN_JSON="$REPO_ROOT/.qa-validator-session/plan.json"
  fi
fi

TARGET_RELEASE_JSON="$(resolve_target_release \
  --release "$CLI_RELEASE" \
  --plan-json "$PLAN_JSON" \
  --repo-root "$REPO_ROOT")"
TARGET_RELEASE="$(echo "$TARGET_RELEASE_JSON" | jq -r '.target_release // empty')"
TARGET_RELEASE_SOURCE="$(echo "$TARGET_RELEASE_JSON" | jq -r '.target_release_source // empty')"

MERGE_VERSION_JSON="$(resolve_merge_version "$MERGE_SHA" "$REPO_ROOT")"
MERGE_VERSION="$(echo "$MERGE_VERSION_JSON" | jq -r '.merge_version // empty')"

# Per-run CI rows use merge_version (factual version when CI ran)
KIBANA_VERSION="$MERGE_VERSION"

# PR changed files for selective CI scope
GH_PAGER=cat gh pr diff "$PR_NUMBER" --repo "$REPO" --name-only > /tmp/qa-ci-diff-$$.txt || true

bk_api_get() {
  local url="$1"
  curl -sS -f -H "Authorization: Bearer ${BUILDKITE_API_TOKEN}" \
    -H "Accept: application/json" "$url"
}

bk_list_builds() {
  local pipeline="$1"
  local commit="$2"
  local url="https://api.buildkite.com/v2/organizations/${BUILDKITE_ORGANIZATION_SLUG}/pipelines/${pipeline}/builds?commit=${commit}&per_page=5"
  if command -v bk >/dev/null 2>&1; then
    BUILDKITE_API_TOKEN="$BUILDKITE_API_TOKEN" BUILDKITE_ORGANIZATION_SLUG="$BUILDKITE_ORGANIZATION_SLUG" \
      bk build list -p "$pipeline" --commit "$commit" --json 2>/dev/null || bk_api_get "$url"
  else
    bk_api_get "$url"
  fi
}

bk_get_jobs() {
  local pipeline="$1"
  local build_number="$2"
  local embedded_jobs="${3:-}"
  if [[ -n "$embedded_jobs" && "$embedded_jobs" != 'null' && "$embedded_jobs" != '[]' ]]; then
    echo "$embedded_jobs"
    return
  fi
  local url="https://api.buildkite.com/v2/organizations/${BUILDKITE_ORGANIZATION_SLUG}/pipelines/${pipeline}/builds/${build_number}/jobs?per_page=100"
  bk_api_get "$url"
}

# Buildkite returns jobs as a bare array, {items:[]}, or embeds them on the build object.
normalize_jobs_json() {
  local jobs_raw="$1"
  echo "$jobs_raw" | jq '
    if type == "object" and has("items") then .items
    elif type == "array" then .
    else [] end
    | [.[]? | {
        name: (.name // .label // .step_key // "unknown"),
        step_key: (.step_key // ""),
        state: (.state // "unknown"),
        finished_at: (.finished_at // null),
        web_url: (.web_url // "")
      }]
  '
}

normalize_job_state() {
  local state="$1"
  case "$state" in
    passed) echo 'passed' ;;
    failed) echo 'failed' ;;
    running|blocked|limiting) echo 'running' ;;
    canceled|canceling|cancelled) echo 'canceled' ;;
    *) echo 'unknown' ;;
  esac
}

# Build pipeline data JSON array
PIPELINE_BUILDS='[]'
for pipeline in "${PIPELINES[@]}"; do
  builds_raw="$(bk_list_builds "$pipeline" "$MERGE_SHA" || echo '[]')"
  build_obj="$(echo "$builds_raw" | jq 'if type == "array" then .[0] else . end')"
  build_entry="$(echo "$build_obj" | jq --arg p "$pipeline" '
    if . == null then empty else {
        pipeline: $p,
        number: (.number // .id),
        state: (.state // "unknown"),
        url: (.web_url // .url // ""),
        finished_at: (.finished_at // null),
        commit: (.commit // "")
      } end
  ')"
  if [[ -n "$build_entry" ]]; then
    build_num="$(echo "$build_entry" | jq -r '.number')"
    embedded_jobs="$(echo "$build_obj" | jq -c '.jobs // empty' 2>/dev/null || echo '')"
    jobs_raw="$(bk_get_jobs "$pipeline" "$build_num" "$embedded_jobs" 2>/dev/null || echo '[]')"
    jobs_compact="$(normalize_jobs_json "$jobs_raw")"
    PIPELINE_BUILDS="$(echo "$PIPELINE_BUILDS" "$build_entry" "$jobs_compact" | jq -s \
      --arg p "$pipeline" '
        .[0] + [{
          pipeline: $p,
          build: .[1],
          jobs: .[2]
        }]
      ')"
  else
    PIPELINE_BUILDS="$(echo "$PIPELINE_BUILDS" | jq --arg p "$pipeline" \
      '. + [{pipeline: $p, build: null, jobs: []}]')"
  fi
done

# Framework default fragments
default_fragments() {
  local framework="$1"
  case "$framework" in
    jest) echo '["jest","Jest","ciGroup"]' ;;
    scout) echo '["scout","Scout"]' ;;
    ftr) echo '["FTR","functional","api_integration"]' ;;
    cypress) echo '["cypress","Cypress"]' ;;
    *) echo '[]' ;;
  esac
}

plugin_slug_from_path() {
  local path="$1"
  if [[ "$path" =~ plugins/([^/]+)/ ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$path" =~ solutions/security/plugins/([^/]+)/ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo ''
  fi
}

ci_scope_for_path() {
  local test_path="$1"
  local plugin
  plugin="$(plugin_slug_from_path "$test_path")"
  if grep -qxF "$test_path" /tmp/qa-ci-diff-$$.txt 2>/dev/null; then
    echo 'expected_ran'
    return
  fi
  if [[ -n "$plugin" ]]; then
    if grep -q "plugins/${plugin}/" /tmp/qa-ci-diff-$$.txt 2>/dev/null \
      || grep -q "solutions/security/plugins/${plugin}/" /tmp/qa-ci-diff-$$.txt 2>/dev/null; then
      echo 'expected_ran'
      return
    fi
  fi
  echo 'skipped_selective'
}

find_matching_job() {
  local jobs_json="$1"
  local fragments_json="$2"
  echo "$jobs_json" | jq --argjson frags "$fragments_json" '
    [.[] | select(
      ([.name, .step_key] | join(" ") | ascii_downcase) as $hay
      | any($frags[]; . as $f | ($hay | contains($f | ascii_downcase)))
    )] | first // null
  '
}

TESTS_OUT='[]'
while IFS= read -r test_row; do
  path="$(echo "$test_row" | jq -r '.path')"
  name="$(echo "$test_row" | jq -r '.name // ""')"
  framework="$(echo "$test_row" | jq -r '.framework // "jest"')"
  custom_frags="$(echo "$test_row" | jq -c '.job_name_fragments // empty')"
  if [[ -z "$custom_frags" || "$custom_frags" == 'null' ]]; then
    frags="$(default_fragments "$framework")"
  else
    frags="$custom_frags"
  fi
  plugin="$(plugin_slug_from_path "$path")"
  if [[ -n "$plugin" && "$framework" == 'scout' ]]; then
    frags="$(echo "$frags" | jq --arg p "$plugin" '. + [$p] | unique')"
  fi
  scope="$(ci_scope_for_path "$path")"

  runs='[]'
  for pipeline in "${PIPELINES[@]}"; do
    block="$(echo "$PIPELINE_BUILDS" | jq --arg p "$pipeline" '.[] | select(.pipeline == $p)')"
    jobs="$(echo "$block" | jq '.jobs')"
    build_url="$(echo "$block" | jq -r '.build.url // ""')"
    job_match="$(find_matching_job "$jobs" "$frags")"
    if [[ "$job_match" == 'null' || -z "$job_match" ]]; then
      runs="$(echo "$runs" | jq --arg p "$pipeline" --arg url "$build_url" --arg sha "$MERGE_SHA" --arg ver "$KIBANA_VERSION" \
        '. + [{pipeline: $p, job: null, status: "unknown", finished_at: null, build_url: $url, commit: $sha, kibana_version: $ver}]')"
    else
      job_name="$(echo "$job_match" | jq -r '.name')"
      job_state="$(echo "$job_match" | jq -r '.state')"
      finished="$(echo "$job_match" | jq -r '.finished_at // null')"
      norm="$(normalize_job_state "$job_state")"
      runs="$(echo "$runs" | jq --arg p "$pipeline" --arg j "$job_name" --arg st "$norm" \
        --arg fin "$finished" --arg url "$build_url" --arg sha "$MERGE_SHA" --arg ver "$KIBANA_VERSION" \
        '. + [{pipeline: $p, job: $j, status: $st, finished_at: ($fin | if . == "null" then null else . end), build_url: $url, commit: $sha, kibana_version: $ver}]')"
    fi
  done

  TESTS_OUT="$(echo "$TESTS_OUT" | jq --argjson row "$(jq -n \
    --arg path "$path" \
    --arg name "$name" \
    --arg framework "$framework" \
    --arg scope "$scope" \
    --argjson runs "$runs" \
    '{path: $path, name: $name, framework: $framework, ci_scope: $scope, runs: $runs}')" \
    '. + [$row]')"
done < <(jq -c '.tests[]' "$TESTS_JSON")

# Aggregate automation status — only pipelines with a build count toward pass/fail.
automation_status='BLOCKED'
if echo "$TESTS_OUT" | jq -e '.[] | select(.ci_scope == "expected_ran")' >/dev/null; then
  if echo "$TESTS_OUT" | jq -e '
    [.[] | select(.ci_scope == "expected_ran") | .runs[] | select(.build_url != "")]
    | length > 0
    and all(.status == "passed")
  ' >/dev/null; then
    automation_status='PASS'
  elif echo "$TESTS_OUT" | jq -e '
    [.[] | select(.ci_scope == "expected_ran") | .runs[] | select(.build_url != "")]
    | any(.status == "failed")
  ' >/dev/null; then
    automation_status='FAIL'
  elif echo "$TESTS_OUT" | jq -e '
    [.[] | select(.ci_scope == "expected_ran") | .runs[] | select(.build_url != "")]
    | length > 0
    and all(.status == "unknown" or .status == "running")
  ' >/dev/null; then
    automation_status='BLOCKED'
  elif echo "$TESTS_OUT" | jq -e '
    [.[] | select(.ci_scope == "expected_ran") | .runs[] | select(.build_url != "")]
    | length == 0
  ' >/dev/null; then
    automation_status='BLOCKED'
  else
    automation_status='FAIL'
  fi
elif echo "$TESTS_OUT" | jq -e 'length > 0' >/dev/null; then
  automation_status='SKIPPED'
fi

evidence="$(echo "$PIPELINE_BUILDS" | jq -c '[.[] | select(.build != null) | "\(.pipeline) build \(.build.number) (\(.build.state))"]')"

jq -n \
  --arg mode 'ci_attestation' \
  --arg status "$automation_status" \
  --arg sha "$MERGE_SHA" \
  --arg target_release "$TARGET_RELEASE" \
  --arg target_release_source "$TARGET_RELEASE_SOURCE" \
  --arg merge_version "$MERGE_VERSION" \
  --argjson backport_labels "$BACKPORT_LABELS" \
  --argjson tests "$TESTS_OUT" \
  --argjson pipelines "$PIPELINE_BUILDS" \
  --argjson evidence "$evidence" \
  '{
    mode: $mode,
    status: $status,
    merge_commit: $sha,
    target_release: (if $target_release == "" then null else $target_release end),
    target_release_source: (if $target_release_source == "" then null else $target_release_source end),
    merge_version: (if $merge_version == "" then null else $merge_version end),
    kibana_version: (if $merge_version == "" then null else $merge_version end),
    backport_labels: $backport_labels,
    tests: $tests,
    pipelines: $pipelines,
    evidence: $evidence
  }'

rm -f /tmp/qa-ci-pr-$$.json /tmp/qa-ci-diff-$$.txt
