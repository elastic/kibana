#!/usr/bin/env bash
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.

# Provisions QAF Elastic Cloud *projects* (serverless) for the DEx API perf
# harness and outputs environments.json ready for:
#   npx tsx run.ts --config environments.json
#
# Usage:
#   ./provision_environments.sh \
#     --cold-count 3 \
#     --warm-count 1 \
#     --results-es-url https://perf-results.es:443 \
#     --results-api-key <base64key> \
#     [--region gcp-us-central1] \
#     [--environment staging] \
#     [--iterations 5] \
#     [--prefix dex-perf] \
#     [--output environments.json]
#
# Prerequisites:
#   - QAF installed and configured
#   - jq installed
#   - EC API key configured in QAF for the target environment

set -euo pipefail

# ------- Defaults -------
COLD_COUNT=3
WARM_COUNT=1
RESULTS_ES_URL=""
RESULTS_API_KEY=""
RESULTS_KB_URL=""
REGION="gcp-us-central1"
ENVIRONMENT="staging"
ITERATIONS=5
PREFIX="dex-perf"
OUTPUT="environments.json"

# ------- Parse args -------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cold-count)       COLD_COUNT="$2"; shift 2 ;;
    --warm-count)       WARM_COUNT="$2"; shift 2 ;;
    --results-es-url)   RESULTS_ES_URL="$2"; shift 2 ;;
    --results-api-key)  RESULTS_API_KEY="$2"; shift 2 ;;
    --results-kb-url)   RESULTS_KB_URL="$2"; shift 2 ;;
    --region)           REGION="$2"; shift 2 ;;
    --environment)      ENVIRONMENT="$2"; shift 2 ;;
    --iterations)       ITERATIONS="$2"; shift 2 ;;
    --prefix)           PREFIX="$2"; shift 2 ;;
    --output)           OUTPUT="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,/^$/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$RESULTS_ES_URL" ]]; then
  echo "Error: --results-es-url is required" >&2
  exit 1
fi
if [[ -z "$RESULTS_API_KEY" ]]; then
  echo "Error: --results-api-key is required" >&2
  exit 1
fi

command -v qaf >/dev/null 2>&1 || { echo "Error: qaf is not installed" >&2; exit 1; }
command -v jq  >/dev/null 2>&1 || { echo "Error: jq is not installed" >&2; exit 1; }

TOTAL=$((COLD_COUNT + WARM_COUNT))
echo "Provisioning $TOTAL serverless security projects ($COLD_COUNT cold-boot, $WARM_COUNT warm-boot)"
echo "  Region     : $REGION"
echo "  Iterations : $ITERATIONS"
echo ""

# ------- Helper: create one project -------
create_project() {
  local name="$1"
  echo ">>> Creating project: $name"
  qaf elastic-cloud projects create \
    --project-name "$name" \
    --project-type security \
    --region "$REGION" \
    --environment "$ENVIRONMENT"
  echo ">>> Created: $name"
}

# ------- Helper: extract project info as JSON -------
get_project_info() {
  local name="$1"
  qaf elastic-cloud projects describe "$name" --as-json --show-credentials
}

# ------- Phase 1: Create all projects -------
PROJECT_NAMES=()

for i in $(seq 1 "$COLD_COUNT"); do
  name="${PREFIX}-cold-${i}"
  create_project "$name"
  PROJECT_NAMES+=("cold:${name}")
done

for i in $(seq 1 "$WARM_COUNT"); do
  name="${PREFIX}-warm-${i}"
  create_project "$name"
  PROJECT_NAMES+=("warm:${name}")
done

echo ""
echo "All $TOTAL projects created. Collecting project info..."
echo ""

# ------- Phase 2: Collect info and build environments.json -------
ENVIRONMENTS_JSON="[]"

for entry in "${PROJECT_NAMES[@]}"; do
  role="${entry%%:*}"
  name="${entry#*:}"

  echo ">>> Fetching info for: $name"
  INFO_JSON=$(get_project_info "$name")

  KIBANA_URL=$(echo "$INFO_JSON" | jq -r '.kibana.url')
  ES_URL=$(echo "$INFO_JSON" | jq -r '.elasticsearch.url')
  USERNAME=$(echo "$INFO_JSON" | jq -r '.credentials.username')
  PASSWORD=$(echo "$INFO_JSON" | jq -r '.credentials.password')
  VERSION=$(echo "$INFO_JSON" | jq -r '.kibana.version // empty')
  VERSION="${VERSION:-serverless}"

  if [[ "$role" == "cold" ]]; then
    ENV_ROLE="cold_boot"
    ENV_ENTRY=$(jq -n \
      --arg id "$name" \
      --arg role "$ENV_ROLE" \
      --arg kb_url "$KIBANA_URL" \
      --arg es_url "$ES_URL" \
      --arg creds "${USERNAME}:${PASSWORD}" \
      --arg version "$VERSION" \
      '{
        id: $id,
        role: $role,
        kibana_url: $kb_url,
        es_url: $es_url,
        credentials: $creds,
        kibana_memory_mb: 0,
        es_heap_mb: 0,
        stack_version: $version,
        notes: "Fresh serverless project, consumed by cold boot"
      }')
  else
    ENV_ROLE="warm_boot"
    ENV_ENTRY=$(jq -n \
      --arg id "$name" \
      --arg role "$ENV_ROLE" \
      --arg kb_url "$KIBANA_URL" \
      --arg es_url "$ES_URL" \
      --arg creds "${USERNAME}:${PASSWORD}" \
      --arg version "$VERSION" \
      --argjson iters "$ITERATIONS" \
      '{
        id: $id,
        role: $role,
        scenarios: ["warm_boot", "scalability", "contention", "double_click", "memory_stability"],
        kibana_url: $kb_url,
        es_url: $es_url,
        credentials: $creds,
        kibana_memory_mb: 0,
        es_heap_mb: 0,
        stack_version: $version,
        iterations: $iters,
        notes: "Reusable serverless project for all warm scenarios"
      }')
  fi

  ENVIRONMENTS_JSON=$(echo "$ENVIRONMENTS_JSON" | jq --argjson e "$ENV_ENTRY" '. + [$e]')
done

# ------- Phase 3: Assemble final config -------
RESULTS_CLUSTER=$(jq -n \
  --arg es_url "$RESULTS_ES_URL" \
  --arg api_key "$RESULTS_API_KEY" \
  '{es_url: $es_url, api_key: $api_key}')

if [[ -n "$RESULTS_KB_URL" ]]; then
  RESULTS_CLUSTER=$(echo "$RESULTS_CLUSTER" | jq --arg kb "$RESULTS_KB_URL" '. + {kibana_url: $kb}')
fi

FINAL_CONFIG=$(jq -n \
  --argjson rc "$RESULTS_CLUSTER" \
  --argjson iters "$ITERATIONS" \
  --argjson envs "$ENVIRONMENTS_JSON" \
  '{
    results_cluster: $rc,
    defaults: {
      iterations: $iters,
      memory_sample_interval_ms: 1000,
      change_history_enabled: true
    },
    max_parallel_environments: 3,
    environments: $envs
  }')

echo "$FINAL_CONFIG" | jq '.' > "$OUTPUT"

echo ""
echo "==============================================="
echo "  environments.json written to: $OUTPUT"
echo "  Projects: $TOTAL ($COLD_COUNT cold, $WARM_COUNT warm)"
echo "==============================================="
echo ""
echo "Next steps:"
echo "  npx tsx run.ts --config $OUTPUT --setup-only   # first-time index templates"
echo "  npx tsx run.ts --config $OUTPUT                # run all scenarios"
echo ""
echo "Teardown (after testing):"
for entry in "${PROJECT_NAMES[@]}"; do
  name="${entry#*:}"
  echo "  qaf elastic-cloud projects delete $name"
done
