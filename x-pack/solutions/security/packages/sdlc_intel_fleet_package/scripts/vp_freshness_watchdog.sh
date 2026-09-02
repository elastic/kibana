#!/bin/bash
# WATCHDOG FOR THE FRESHNESS PIPELINE ITSELF.
#
# WHY THIS EXISTS: refresh_freshness.sh fails CLOSED - if the rebuild produces no
# docs it leaves the previous table in place and exits 1. That is correct (never
# serve an empty table to the alert), but it means a permanently broken rebuild is
# INVISIBLE: the stall alert keeps reading a plausible-looking frozen snapshot and
# never fires. Exactly this happened 2026-09-01/02: the transform went health:red
# (fielddata error from a wildcard-swept derived index), the table froze at
# 22:01, and nothing anywhere reported a problem for ~15h.
#
# So: assert on the AGE OF THE FRESHNESS TABLE and the TRANSFORM HEALTH, not on
# whether the table has rows. A monitor that cannot detect its own death is not a
# monitor.
set -uo pipefail
ES=http://127.0.0.1:9220
AUTH=elastic:changeme
LIVE=vp-ingest-freshness
TID=sdlc-ingest-freshness
MAX_AGE_MIN=45          # rebuild runs every 15m; 3 consecutive misses = broken
STATE=/tmp/vp_freshness_watchdog.state

fail() { echo "WATCHDOG FAIL: $*" >&2; echo "$(date -u +%FT%TZ) FAIL $*" >> "$STATE"; exit 1; }

# 1. Transform health must be green (state alone is NOT a health signal - it
#    reports "started" while red with 0 docs indexed).
H=$(curl -s --max-time 20 -u $AUTH "$ES/_transform/$TID/_stats" \
     | python3 -c "import json,sys;t=json.load(sys.stdin)['transforms'][0];print(t.get('health',{}).get('status','unknown'))" 2>/dev/null)
[ "$H" = "green" ] || fail "transform $TID health=$H (expected green)"

# 2. The freshness table must have been REBUILT recently. max(last_write) tracks
#    source data; instead check the build index's own creation time via the alias.
IDX=$(curl -s --max-time 20 -u $AUTH "$ES/_cat/aliases/$LIVE?h=index" | tr -d " \r\n")
[ -n "$IDX" ] || fail "alias $LIVE resolves to no index"

CREATED=$(curl -s --max-time 20 -u $AUTH "$ES/$IDX/_settings?filter_path=**.creation_date" \
           | python3 -c "import json,sys;d=json.load(sys.stdin);print(list(d.values())[0]['settings']['index']['creation_date'])" 2>/dev/null)
[ -n "$CREATED" ] || fail "cannot read creation_date of $IDX"

AGE_MIN=$(( ( $(date +%s) - CREATED/1000 ) / 60 ))
[ "$AGE_MIN" -le "$MAX_AGE_MIN" ] || fail "freshness table $IDX is ${AGE_MIN}m old (max ${MAX_AGE_MIN}m) - rebuild is not running"

# 3. Table must be non-empty and cover a plausible number of sources.
N=$(curl -s --max-time 20 -u $AUTH "$ES/$LIVE/_count" | python3 -c "import json,sys;print(json.load(sys.stdin).get('count',0))" 2>/dev/null)
[ "${N:-0}" -ge 15 ] || fail "freshness table has only ${N:-0} sources (expected >=15)"

echo "$(date -u +%FT%TZ) OK health=$H index=$IDX age=${AGE_MIN}m sources=$N" >> "$STATE"
echo "watchdog OK: health=$H, table=$IDX, age=${AGE_MIN}m, sources=$N"
exit 0
