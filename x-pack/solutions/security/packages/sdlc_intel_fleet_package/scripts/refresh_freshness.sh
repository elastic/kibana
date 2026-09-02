#!/bin/bash
# Recompute the ingest-freshness table that the stall alert reads.
#
# WHY BATCH, NOT CONTINUOUS: a continuous transform with sync.time.field only
# reprocesses buckets receiving NEW data, so a source that STOPS writing is
# never revisited - structurally unable to detect what we alert on.
#
# WHY EXPLICIT SOURCES: a bare sdlc-* wildcard swept in scratch indices and
# derived ones (sdlc-semantic-work), inventing phantom sources.
#
# WHY TIMESTAMPED BUILD + ALIAS SWAP: never leave the alert querying an empty
# index (false green). Build into a NEW index each run; swap the alias only
# after verifying it is non-empty; then drop the previous index.
set -uo pipefail
ES=http://127.0.0.1:9220
AUTH=elastic:changeme
TID=sdlc-ingest-freshness
LIVE=vp-ingest-freshness
BUILD=vp-freshness-$(date +%Y%m%d%H%M%S)
SRC='["github-intel-comments","github-intel-issues","github-intel-people","github-intel-project-items","github-intel-project-views","github-intel-projects","github-intel-pull-requests","github-intel-relationships","github-intel-repos","github-intel-sync-state","github-intel-teams","sdlc-epic-phases","sdlc-team-dimension","sdlc-release-calendar","sdlc-pr-missing-related-issue"]'

curl -s -u $AUTH -XPOST "$ES/_transform/$TID/_stop?force=true&wait_for_completion=true" -o /dev/null
sleep 4
curl -s -u $AUTH -XDELETE "$ES/_transform/$TID" -o /dev/null
sleep 2
curl -s -u $AUTH -XPUT "$ES/_transform/$TID" -H "Content-Type: application/json" -d "{
  \"source\": {\"index\": $SRC},
  \"dest\": {\"index\": \"$BUILD\"},
  \"pivot\": {
    \"group_by\": {\"source\": {\"terms\": {\"field\": \"sync.source\"}}},
    \"aggregations\": {
      \"doc_count_total\": {\"value_count\": {\"field\": \"sync.source\"}},
      \"last_write\": {\"max\": {\"field\": \"@timestamp\"}}
    }
  }
}" -o /dev/null
curl -s -u $AUTH -XPOST "$ES/_transform/$TID/_start" -o /dev/null

N=0
for i in $(seq 1 60); do
  sleep 5
  curl -s -u $AUTH -XPOST "$ES/$BUILD/_refresh" -o /dev/null
  N=$(curl -s -u $AUTH "$ES/$BUILD/_count" | sed -n "s/.*\"count\":\([0-9]*\).*/\1/p")
  [ "${N:-0}" -gt 0 ] && break
done

if [ "${N:-0}" -le 0 ]; then
  echo "freshness rebuild produced no docs; previous table left intact" >&2
  curl -s -u $AUTH -XDELETE "$ES/$BUILD" -o /dev/null
  exit 1
fi

# collect what currently answers to LIVE (concrete index on first run, alias after)
PREV=$(curl -s -u $AUTH "$ES/_cat/aliases/$LIVE?h=index" | tr -d " \r")
if [ -z "$PREV" ]; then
  curl -s -u $AUTH -XDELETE "$ES/$LIVE" -o /dev/null   # first run: concrete index
  curl -s -u $AUTH -XPOST "$ES/_aliases" -H "Content-Type: application/json" -d "{\"actions\":[{\"add\":{\"index\":\"$BUILD\",\"alias\":\"$LIVE\"}}]}" -o /dev/null
else
  curl -s -u $AUTH -XPOST "$ES/_aliases" -H "Content-Type: application/json" -d "{\"actions\":[{\"remove\":{\"index\":\"$PREV\",\"alias\":\"$LIVE\"}},{\"add\":{\"index\":\"$BUILD\",\"alias\":\"$LIVE\"}}]}" -o /dev/null
  curl -s -u $AUTH -XDELETE "$ES/$PREV" -o /dev/null
fi
echo "freshness table rebuilt: $N sources -> $BUILD"
exit 0
