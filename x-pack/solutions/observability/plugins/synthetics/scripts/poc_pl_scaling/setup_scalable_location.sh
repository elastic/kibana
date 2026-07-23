#!/usr/bin/env bash
#
# POC harness: Private Locations horizontal scaling & HA (Kibana-side sharding).
# See elastic/synthetics-dev#462 and obs-execution#24 (condition-based sharding).
#
# Provisions ONE Fleet agent policy and ONE "scalable" Synthetics private location
# bound to it with agentConditionSharding=true. Then prints the docker commands to
# enroll N elastic-agent-complete instances (distinct hostnames) into that single
# policy, plus a verification query.
#
# Requirements: a running Kibana + Elasticsearch (local dev stack is fine), curl,
# jq, and docker. This is throwaway POC tooling — not production code.
#
# Usage:
#   KIBANA_URL=http://localhost:5601 ES_HOST=http://localhost:9200 \
#   KIBANA_USER=elastic KIBANA_PASS=changeme N_AGENTS=3 \
#   ./setup_scalable_location.sh

set -euo pipefail

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_HOST="${ES_HOST:-http://localhost:9200}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASS="${KIBANA_PASS:-changeme}"
N_AGENTS="${N_AGENTS:-3}"
PL_LABEL="${PL_LABEL:-Scalable POC location}"

AUTH=(-u "${KIBANA_USER}:${KIBANA_PASS}")
KBN_HDR=(-H "kbn-xsrf: true" -H "Content-Type: application/json")

kbn() { curl -sf "${AUTH[@]}" "${KBN_HDR[@]}" "$@"; }

echo "==> Creating 1 agent policy (shared by ${N_AGENTS} agents)"
AGENT_POLICY_ID=$(kbn -X POST "${KIBANA_URL}/api/fleet/agent_policies" -d "{
  \"name\": \"synthetics-poc-condition-$(date +%s)\",
  \"namespace\": \"default\",
  \"monitoring_enabled\": [\"logs\", \"metrics\"],
  \"inactivity_timeout\": 1209600
}" | jq -r '.item.id')
echo "    agent policy: ${AGENT_POLICY_ID}"

echo "==> Creating scalable private location (condition-based sharding)"
PL_ID=$(kbn -X POST "${KIBANA_URL}/api/synthetics/private_locations" -d "{
  \"label\": \"${PL_LABEL}\",
  \"agentPolicyId\": \"${AGENT_POLICY_ID}\",
  \"agentConditionSharding\": true
}" | jq -r '.id')
echo "    private location id: ${PL_ID}"

echo
echo "════════════════════════════════════════════════════════════════"
echo " Scalable private location ready"
echo "   PL id:         ${PL_ID}"
echo "   agent policy:  ${AGENT_POLICY_ID}"
echo "════════════════════════════════════════════════════════════════"
echo
echo "Next steps:"
echo
echo "1) Ensure a Fleet Server is running (once), e.g. from Fleet UI or the"
echo "   kbn-synthetics-private-location CLI. Then enroll ${N_AGENTS} agents into the"
echo "   SAME policy, each with a DISTINCT hostname (the shard key is host.name):"
echo

VERSION=$(kbn "${KIBANA_URL}/api/status" | jq -r '.version.number')
TOKEN=$(kbn "${KIBANA_URL}/api/fleet/enrollment_api_keys?kuery=policy_id:${AGENT_POLICY_ID}" | jq -r '.items[0].api_key')
for i in $(seq 1 "${N_AGENTS}"); do
  cat <<EOF
   # agent ${i}
   docker run -d --name synthetics-poc-agent-${i} --hostname synthetics-poc-agent-${i} \\
     -e FLEET_URL=https://host.docker.internal:8220 \\
     -e FLEET_ENROLL=1 -e FLEET_INSECURE=1 \\
     -e FLEET_ENROLLMENT_TOKEN=${TOKEN} \\
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

   The rebalance task (Synthetics:Rebalance-Private-Location-Shards, ~1m) rewrites
   that host's monitors' conditions onto the healthy agents. Re-run the query in
   step 3 — still zero duplicates, and no monitor stops producing runs. Monitors
   that were NOT on the killed agent never move (rendezvous property).
EOF
