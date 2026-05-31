#!/usr/bin/env bash
# Smoke-test SDLC workflow ingest: setup indices, optional full GitHub sync, ES validation.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"
source "$REPO_ROOT/scripts/kibana_api_common.sh"

SETUP_WORKFLOW_ID="system-sdlc-setup-indices"
SYNC_WORKFLOW_ID="system-sdlc-github-sync-orchestrator"
SPACE="${KIBANA_SPACE:-default}"
ES_URL="${ES_URL:-http://localhost:9200}"
ES_AUTH="${ES_AUTH:-elastic:changeme}"
RUN_SYNC="${RUN_SYNC:-auto}"
POLL_SECS="${POLL_SECS:-300}"
POLL_INTERVAL="${POLL_INTERVAL:-5}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --setup-only     Run ${SETUP_WORKFLOW_ID} (requires create_index on github-intel-* / sdlc-*)
  --full-sync      Run setup + ${SYNC_WORKFLOW_ID} (requires GitHub connector or GITHUB_TOKEN)
  --sync-only      Run ${SYNC_WORKFLOW_ID} only (indices must already exist)
  --space ID       Kibana space (default: default)
  -h, --help       Show this help

Environment:
  GITHUB_CONNECTOR_ID      Recommended: GitHub (.github) connector ID or name for sync workflows
  GITHUB_TOKEN / GH_TOKEN  Fallback for GitHub sync when no connector is configured
  KIBANA_URL / KIBANA_AUTH Override Kibana connection (see scripts/kibana_api_common.sh)
  ES_URL / ES_AUTH         Elasticsearch for post-run validation
  RUN_SYNC                 auto|1|0 — auto runs sync when connector ID or token is set (default: auto)
EOF
}

MODE="auto"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --setup-only | --bootstrap-only) MODE="setup" ;;
    --full-sync) MODE="full" ;;
    --sync-only) MODE="sync" ;;
    --space) SPACE="$2"; shift ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if [[ "$RUN_SYNC" == "auto" ]]; then
  if [[ -n "${GITHUB_CONNECTOR_ID:-}" || -n "${GITHUB_TOKEN:-}" || -n "${GH_TOKEN:-}" ]]; then
    RUN_SYNC=1
  else
    RUN_SYNC=0
  fi
fi

if [[ "$MODE" == "auto" ]]; then
  if [[ "$RUN_SYNC" == "1" ]]; then
    MODE="full"
  else
    MODE="setup"
  fi
fi

log() { printf '[sdlc-test] %s\n' "$*"; }
fail() { log "ERROR: $*"; exit 1; }

require_kibana() {
  local code
  code="$(kibana_curl -s -o /dev/null -w '%{http_code}' "${KIBANA_URL}/api/status" || true)"
  [[ "$code" == "200" ]] || fail "Kibana is not reachable at ${KIBANA_URL} (HTTP ${code:-none}). Start with: yarn start"
}

require_es() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -u "$ES_AUTH" "${ES_URL}/_cluster/health" || true)"
  [[ "$code" == "200" ]] || fail "Elasticsearch is not reachable at ${ES_URL} (HTTP ${code:-none})"
}

api_path() {
  local path="$1"
  if [[ "$SPACE" == "default" ]]; then
    echo "$path"
  else
    echo "/s/${SPACE}${path}"
  fi
}

get_workflow() {
  local id="$1"
  kibana_curl -s "$(api_path "/api/workflows/workflow/${id}")"
}

run_workflow() {
  local id="$1"
  kibana_curl -s -X POST "$(api_path "/api/workflows/workflow/${id}/run")" \
    -H 'Content-Type: application/json' \
    -d '{"inputs":{}}'
}

wait_for_execution() {
  local exec_id="$1"
  local deadline=$((SECONDS + POLL_SECS))
  while (( SECONDS < deadline )); do
    local body status
    body="$(kibana_curl -s "$(api_path "/api/workflows/executions/${exec_id}?includeOutput=true")")"
    status="$(node -e 'const j=JSON.parse(process.argv[1]); process.stdout.write(j.status||"");' "$body")"
    log "execution ${exec_id}: status=${status:-unknown}"
    case "$status" in
      completed) echo "$body"; return 0 ;;
      failed | cancelled | timed_out | skipped)
        log "Execution payload:"
        echo "$body" | node -e 'process.stdin.on("data",d=>console.log(JSON.stringify(JSON.parse(d),null,2)))'
        fail "Workflow execution ended with status: ${status}"
        ;;
    esac
    sleep "$POLL_INTERVAL"
  done
  fail "Timed out after ${POLL_SECS}s waiting for execution ${exec_id}"
}

assert_workflow_ready() {
  local id="$1"
  local body enabled valid
  body="$(get_workflow "$id")"
  enabled="$(node -e 'const j=JSON.parse(process.argv[1]); process.stdout.write(String(j.enabled));' "$body")"
  valid="$(node -e 'const j=JSON.parse(process.argv[1]); process.stdout.write(String(j.valid));' "$body")"
  if [[ "$enabled" != "true" || "$valid" != "true" ]]; then
    log "Workflow ${id} response:"
    echo "$body" | node -e 'process.stdin.on("data",d=>console.log(JSON.stringify(JSON.parse(d),null,2)))'
    fail "Workflow ${id} is missing, disabled, or invalid. Restart Kibana so sdlcIntel can install managed workflows."
  fi
  log "Workflow ${id} is installed, enabled, and valid"
}

validate_indices() {
  local indices=(
    github-intel-projects
    github-intel-project-items
    github-intel-project-views
    github-intel-repos
    github-intel-issues
    github-intel-pull-requests
    github-intel-comments
    github-intel-people
    github-intel-teams
    github-intel-relationships
    github-intel-sync-state
    sdlc-team-dimension
    sdlc-epic-phases
  )
  log "Validating Elasticsearch indices at ${ES_URL}"
  for index in "${indices[@]}"; do
    local code count
    code="$(curl -s -o /dev/null -w '%{http_code}' -u "$ES_AUTH" "${ES_URL}/${index}" || true)"
    [[ "$code" == "200" ]] || fail "Index ${index} is missing (HTTP ${code:-none}). Run ${SETUP_WORKFLOW_ID} first."
    count="$(curl -s -u "$ES_AUTH" "${ES_URL}/${index}/_count" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(String(j.count??"missing"));')"
    log "  ${index}: ${count} docs"
  done
}

run_step() {
  local workflow_id="$1"
  assert_workflow_ready "$workflow_id"
  log "Running workflow ${workflow_id}..."
  local run_body exec_id
  run_body="$(run_workflow "$workflow_id")"
  exec_id="$(node -e 'const j=JSON.parse(process.argv[1]); if(!j.workflowExecutionId) process.exit(1); process.stdout.write(j.workflowExecutionId);' "$run_body")" \
    || fail "Run API failed: ${run_body}"
  log "Started execution ${exec_id}"
  wait_for_execution "$exec_id" >/dev/null
  log "Workflow ${workflow_id} completed successfully"
}

log "Kibana: ${KIBANA_URL} | space: ${SPACE} | mode: ${MODE}"
require_kibana
require_es

case "$MODE" in
  setup) run_step "$SETUP_WORKFLOW_ID" ;;
  sync)
    [[ "$RUN_SYNC" == "1" ]] || fail "GitHub sync requires GITHUB_CONNECTOR_ID, GITHUB_TOKEN, or GH_TOKEN"
    validate_indices
    run_step "$SYNC_WORKFLOW_ID"
    ;;
  full)
    [[ "$RUN_SYNC" == "1" ]] || fail "Full sync requires GITHUB_TOKEN (or GH_TOKEN) on the Kibana server process"
    run_step "$SETUP_WORKFLOW_ID"
    run_step "$SYNC_WORKFLOW_ID"
    ;;
  *) fail "Unknown mode: ${MODE}" ;;
esac

validate_indices
log "Done."
