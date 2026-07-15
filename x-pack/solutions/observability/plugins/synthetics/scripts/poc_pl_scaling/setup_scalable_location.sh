#!/usr/bin/env bash
#
# POC harness: Private Locations horizontal scaling & HA (Kibana-side sharding).
# See elastic/synthetics-dev#462 and obs-execution#24 (Option 3 / policy sharding).
#
# Provisions N Fleet agent policies (shards) and ONE "scalable" Synthetics private
# location that references all of them via agentPolicyIds. Then prints the docker
# commands to enroll one elastic-agent-complete per shard and a verification query.
#
# Requirements: a running Kibana + Elasticsearch (local dev stack is fine), curl,
# jq, and docker. This is throwaway POC tooling — not production code.
#
# Usage:
#   KIBANA_URL=http://localhost:5601 ES_HOST=http://localhost:9200 \
#   KIBANA_USER=elastic KIBANA_PASS=changeme N_SHARDS=3 \
#   ./setup_scalable_location.sh

set -euo pipefail

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_HOST="${ES_HOST:-http://localhost:9200}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASS="${KIBANA_PASS:-changeme}"
N_SHARDS="${N_SHARDS:-3}"
PL_LABEL="${PL_LABEL:-Scalable POC location}"

AUTH=(-u "${KIBANA_USER}:${KIBANA_PASS}")
KBN_HDR=(-H "kbn-xsrf: true" -H "Content-Type: application/json")

kbn() { curl -sf "${AUTH[@]}" "${KBN_HDR[@]}" "$@"; }

echo "==> Creating ${N_SHARDS} agent policies (shards)"
SHARD_IDS=()
for i in $(seq 1 "${N_SHARDS}"); do
  id=$(kbn -X POST "${KIBANA_URL}/api/fleet/agent_policies" -d "{
    \"name\": \"synthetics-poc-shard-${i}-$(date +%s)\",
    \"namespace\": \"default\",
    \"monitoring_enabled\": [\"logs\", \"metrics\"],
    \"inactivity_timeout\": 1209600
  }" | jq -r '.item.id')
  SHARD_IDS+=("${id}")
  echo "    shard ${i}: ${id}"
done

# Build the agentPolicyIds JSON array for the scalable private location.
POOL_JSON=$(printf '%s\n' "${SHARD_IDS[@]}" | jq -R . | jq -s .)
PRIMARY="${SHARD_IDS[0]}"

echo "==> Creating scalable private location (pool of ${N_SHARDS} shards)"
PL_ID=$(kbn -X POST "${KIBANA_URL}/api/synthetics/private_locations" -d "{
  \"label\": \"${PL_LABEL}\",
  \"agentPolicyId\": \"${PRIMARY}\",
  \"agentPolicyIds\": ${POOL_JSON}
}" | jq -r '.id')
echo "    private location id: ${PL_ID}"

echo
echo "════════════════════════════════════════════════════════════════"
echo " Scalable private location ready"
echo "   PL id:   ${PL_ID}"
echo "   shards:  ${SHARD_IDS[*]}"
echo "════════════════════════════════════════════════════════════════"
echo
echo "Next steps:"
echo
echo "1) Ensure a Fleet Server is running (once), e.g. from Fleet UI or the"
echo "   kbn-synthetics-private-location CLI. Then enroll ONE agent per shard so"
echo "   each shard has exactly one executing agent:"
echo

VERSION=$(kbn "${KIBANA_URL}/api/status" | jq -r '.version.number')
for i in "${!SHARD_IDS[@]}"; do
  shard="${SHARD_IDS[$i]}"
  token=$(kbn "${KIBANA_URL}/api/fleet/enrollment_api_keys?kuery=policy_id:${shard}" | jq -r '.items[0].api_key')
  n=$((i + 1))
  cat <<EOF
   # shard ${n} (${shard})
   docker run -d --name synthetics-poc-agent-${n} \\
     -e FLEET_URL=https://host.docker.internal:8220 \\
     -e FLEET_ENROLL=1 -e FLEET_INSECURE=1 \\
     -e FLEET_ENROLLMENT_TOKEN=${token} \\
     docker.elastic.co/elastic-agent/elastic-agent-complete:${VERSION}-SNAPSHOT

EOF
done

cat <<EOF
2) Create ~10 monitors on private location "${PL_LABEL}" (UI, API, or kbn-synthetics-forge).

3) VERIFY no duplicates — each monitor's runs should come from a single agent.
   Run this ES|QL (Discover / _query) over the synthetics index:

   FROM synthetics-*
   | WHERE monitor.type IS NOT NULL AND observer.name == "${PL_LABEL}"
   | STATS agents = COUNT_DISTINCT(agent.id) BY monitor.id
   | WHERE agents > 1

   Expect ZERO rows (each monitor pinned to one agent → at-most-once).

4) DEMO failover/rebalancing — kill one agent, wait ~1 rebalance interval:

   docker rm -f synthetics-poc-agent-1

   The rebalance task (Synthetics:Rebalance-Private-Location-Shards, ~1m) moves
   that shard's monitors onto the healthy shards. Re-run the query in step 3 —
   still zero duplicates, and no monitor stops producing runs. Monitors that were
   NOT on the killed shard never move (rendezvous property).
EOF
