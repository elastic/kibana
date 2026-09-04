#!/bin/bash
# Forensics Watch eval cell preflight — every check here guards ≥1 run lost
# during the 2026-09-03/04 bring-up (see references/azure-eval-cell-hermetic-runbook.md).
# Usage: bash scripts/preflight_eval_cell.sh [--kibana-url http://localhost:5620] [--es-url http://localhost:9220]
# Exit 0 = cell ready; nonzero = DO NOT run the suite; the message names the trap.
set -uo pipefail

KB_URL="http://localhost:5620"
ES_URL="http://localhost:9220"
KB_USER="elastic"
KB_PASS="changeme"
EXPECTED_SHA="${EXPECTED_SHA:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --kibana-url) KB_URL="$2"; shift 2 ;;
    --es-url) ES_URL="$2"; shift 2 ;;
    --expected-sha) EXPECTED_SHA="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
AUTH="$KB_USER:$KB_PASS"
fail() { echo "PREFLIGHT FAIL [$1] $2" >&2; exit 1; }
pass() { echo "ok: $1"; }

# 1. Tree: on the expected branch/SHA (stale/half-versioned tree trap; cleandw3)
if [ -n "$EXPECTED_SHA" ]; then
  HEAD=$(git rev-parse HEAD) || fail tree "not a git checkout"
  [ "$HEAD" = "$EXPECTED_SHA" ] || fail tree "HEAD $HEAD != expected $EXPECTED_SHA (stale/partial tree)"
  pass "tree @ $HEAD"
fi

# 2. No foreign ES/Kibana/scout processes (shared-cell contamination trap)
FOREIGN=$(ps aux | grep "[o]rg.elasticsearch" | grep -v "$PWD" | wc -l | tr -d ' ')
[ "$FOREIGN" = "0" ] || fail foreign-procs "$FOREIGN ES processes running outside this checkout"
pass "no foreign stack processes"

# 3. inotify limits (deterministic Kibana watcher boot crash; dwv17run/b)
INSTANCES=$(cat /proc/sys/fs/inotify/max_user_instances)
[ "$INSTANCES" -ge 512 ] || fail inotify "max_user_instances=$INSTANCES (need >=512; fix: sysctl fs.inotify.max_user_instances=1024)"
pass "inotify instances=$INSTANCES"

# 4. Stack up and available
STATUS=$(curl -s -m5 -u "$AUTH" "$KB_URL/api/status" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status",{}).get("overall",{}).get("level",""))' 2>/dev/null)
[ "$STATUS" = "available" ] || fail stack "Kibana status='$STATUS' (expected available)"
pass "stack available"

# 5. Connectors present (the 3-precondition chain: secrets shape + exposeConfig + CCM)
NKC=$(curl -s -m5 -u "$AUTH" "$KB_URL/api/actions/connectors" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))' 2>/dev/null || echo 0)
[ "$NKC" -ge 1 ] || fail connectors "0 connectors in Kibana -- every gate run fails 'No connector available for chat execution'. Check config set (evals_tracing-derived) + enable_eis_ccm.js ran."
pass "connectors=$NKC"

# 6. Default AI connector uiSetting (per-key GET 404s; scan the settings list)
DEF=$(curl -s -m5 -u "$AUTH" "$KB_URL/api/kibana/settings" 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("settings",{}).get("genAiSettings:defaultAIConnector",{}).get("userValue","") or "")' 2>/dev/null)
[ -n "$DEF" ] || fail default-connector "genAiSettings:defaultAIConnector not set"
pass "default AI connector=$DEF"

# 7. Watch definition installed + enabled (PND flag + suite-time install)
#    Workflow docs have no top-level id; key by display name.
WF_NAME="${DW_WORKFLOW_NAME:-Deep Watch}"
MV=$(curl -s -m5 -u "$AUTH" "$ES_URL/.workflows-workflows-000001/_count" -H 'Content-Type: application/json' \
  -d "{\"query\":{\"bool\":{\"filter\":[{\"match\":{\"name\":\"$WF_NAME\"}},{\"term\":{\"enabled\":true}}]}}}" 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("count",0))' 2>/dev/null)
[ "$MV" -ge 1 ] || fail watch "workflow '$WF_NAME' enabled count=$MV (PND enabled? watch installed/enabled by suite?)"
pass "watch definition present"

# 8. Seed data queryable AFTER the suite seeds (run this post-seed too; the
#    seeder itself now blocks until queryable -- this is the belt to its braces)
SEEDC=$(curl -s -m5 -u "$AUTH" "$ES_URL/logs-endpoint.events.process-default/_count" -H 'Content-Type: application/json' \
  -d '{"query":{"term":{"event.dataset":"endpoint forensics watch eval seed"}}}' 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("count",0))' 2>/dev/null)
echo "info: seeded telemetry docs visible: $SEEDC (suite asserts >=11 itself; informational pre-run)"

echo "PREFLIGHT OK -- cell ready"
