#!/usr/bin/env bash
# Script to make monitors unhealthy with different causes for local testing.
# Usage: bash scripts/break_monitors.sh
#
# Prerequisites: Kibana running at localhost:5603 with elastic:changeme
# and a private location already created.

set -euo pipefail

BASE="http://localhost:5603"
AUTH="elastic:changeme"
HEADERS=(-H "kbn-xsrf: true" -H "x-elastic-internal-origin: kibana" -H "Content-Type: application/json")

LOC_ID="a9131258-5d82-4b7f-9c66-8982f231ea8e"
LOC_LABEL="Default location 9250ba4f-1b52-4dc2-a48c-2447150f556f"
AGENT_POLICY_ID="c1ce5f9a-bec9-4999-b89e-2f6dae9d18b6"

TS=$(date +%s)
echo "=== Creating monitors (run $TS) ==="

MON1=$(curl -s -u "$AUTH" "$BASE/api/synthetics/monitors" "${HEADERS[@]}" \
  -H "elastic-api-version: 2023-10-31" \
  -d "{
    \"type\": \"http\",
    \"name\": \"Unhealthy: missing_package_policy ($TS)\",
    \"urls\": \"https://httpbin.org/status/200\",
    \"schedule\": { \"number\": \"10\", \"unit\": \"m\" },
    \"locations\": [{\"id\": \"$LOC_ID\", \"label\": \"$LOC_LABEL\", \"isServiceManaged\": false, \"agentPolicyId\": \"$AGENT_POLICY_ID\"}],
    \"enabled\": true
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id', d.get('config_id')))")
echo "  Monitor 'missing_package_policy': $MON1"

MON2=$(curl -s -u "$AUTH" "$BASE/api/synthetics/monitors" "${HEADERS[@]}" \
  -H "elastic-api-version: 2023-10-31" \
  -d "{
    \"type\": \"http\",
    \"name\": \"Unhealthy: agent_policy_mismatch ($TS)\",
    \"urls\": \"https://httpbin.org/status/200\",
    \"schedule\": { \"number\": \"10\", \"unit\": \"m\" },
    \"locations\": [{\"id\": \"$LOC_ID\", \"label\": \"$LOC_LABEL\", \"isServiceManaged\": false, \"agentPolicyId\": \"$AGENT_POLICY_ID\"}],
    \"enabled\": true
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id', d.get('config_id')))")
echo "  Monitor 'agent_policy_mismatch': $MON2"

MON3=$(curl -s -u "$AUTH" "$BASE/api/synthetics/monitors" "${HEADERS[@]}" \
  -H "elastic-api-version: 2023-10-31" \
  -d "{
    \"type\": \"http\",
    \"name\": \"Unhealthy: missing_agent_policy ($TS)\",
    \"urls\": \"https://httpbin.org/status/200\",
    \"schedule\": { \"number\": \"10\", \"unit\": \"m\" },
    \"locations\": [{\"id\": \"$LOC_ID\", \"label\": \"$LOC_LABEL\", \"isServiceManaged\": false, \"agentPolicyId\": \"$AGENT_POLICY_ID\"}],
    \"enabled\": true
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id', d.get('config_id')))")
echo "  Monitor 'missing_agent_policy': $MON3"

echo ""
echo "=== Breaking monitors ==="

# 1) missing_package_policy: delete the package policy
echo "  [missing_package_policy] Deleting package policy for $MON1..."
curl -s -u "$AUTH" "$BASE/api/fleet/package_policies/delete" "${HEADERS[@]}" \
  -d "{\"packagePolicyIds\": [\"${MON1}-${LOC_ID}\"], \"force\": true}" > /dev/null
echo "    Done."

# 2) agent_policy_mismatch: reassign the package policy to a different agent policy
echo "  [agent_policy_mismatch] Creating a decoy agent policy..."
WRONG_AGENT=$(curl -s -u "$AUTH" "$BASE/api/fleet/agent_policies" "${HEADERS[@]}" \
  -d "{\"name\": \"Decoy agent policy (mismatch test) $TS\", \"namespace\": \"default\", \"monitoring_enabled\": []}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['item']['id'])")
echo "    Decoy agent policy: $WRONG_AGENT"

echo "  [agent_policy_mismatch] Reassigning package policy to decoy agent..."
POLICY_JSON=$(curl -s -u "$AUTH" "$BASE/api/fleet/package_policies/${MON2}-${LOC_ID}" "${HEADERS[@]}" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)['item']
d['policy_ids'] = ['$WRONG_AGENT']
d['policy_id'] = '$WRONG_AGENT'
d['is_managed'] = False
for k in ['revision','created_at','created_by','updated_at','updated_by','id','version','elasticsearch','agents','status','secret_references','spaceIds']:
    d.pop(k, None)
print(json.dumps(d))
")
curl -s -u "$AUTH" "$BASE/api/fleet/package_policies/${MON2}-${LOC_ID}" \
  -X PUT "${HEADERS[@]}" -d "$POLICY_JSON" > /dev/null
echo "    Done."

# 3) missing_agent_policy: delete the agent policy that the package policy points to
#    We first reassign to a throwaway agent policy, then delete that policy.
echo "  [missing_agent_policy] Creating a throwaway agent policy..."
THROWAWAY_AGENT=$(curl -s -u "$AUTH" "$BASE/api/fleet/agent_policies" "${HEADERS[@]}" \
  -d "{\"name\": \"Throwaway agent policy (will be deleted) $TS\", \"namespace\": \"default\", \"monitoring_enabled\": []}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['item']['id'])")
echo "    Throwaway agent policy: $THROWAWAY_AGENT"

echo "  [missing_agent_policy] Reassigning package policy to throwaway agent..."
POLICY_JSON3=$(curl -s -u "$AUTH" "$BASE/api/fleet/package_policies/${MON3}-${LOC_ID}" "${HEADERS[@]}" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)['item']
d['policy_ids'] = ['$THROWAWAY_AGENT']
d['policy_id'] = '$THROWAWAY_AGENT'
d['is_managed'] = False
for k in ['revision','created_at','created_by','updated_at','updated_by','id','version','elasticsearch','agents','status','secret_references','spaceIds']:
    d.pop(k, None)
print(json.dumps(d))
")
curl -s -u "$AUTH" "$BASE/api/fleet/package_policies/${MON3}-${LOC_ID}" \
  -X PUT "${HEADERS[@]}" -d "$POLICY_JSON3" > /dev/null

echo "  [missing_agent_policy] Deleting throwaway agent policy..."
curl -s -u "$AUTH" "$BASE/api/fleet/agent_policies/delete" "${HEADERS[@]}" \
  -d "{\"agentPolicyId\": \"$THROWAWAY_AGENT\"}" > /dev/null
echo "    Done."

echo ""
echo "=== Verifying health ==="
curl -s -u "$AUTH" "$BASE/internal/synthetics/monitors/_health" "${HEADERS[@]}" \
  -d "{\"monitorIds\": [\"$MON1\", \"$MON2\", \"$MON3\"]}" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for m in d['monitors']:
    s = m['locations'][0]['status']
    icon = 'OK' if s == 'healthy' else 'XX'
    print(f'  [{icon}] {m[\"monitorName\"]}: {s}')
"

echo ""
echo "=== Done ==="
echo "Monitor IDs for cleanup:"
echo "  $MON1"
echo "  $MON2"
echo "  $MON3"
