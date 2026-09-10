#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set KIBANA_ROOT to 7 levels up from the script directory (to reach Kibana root)
KIBANA_ROOT="$SCRIPT_DIR/../../../../../../.."

# Elasticsearch and Kibana URLs and credentials
ES_URL="http://elastic:changeme@localhost:9200"
KIBANA_URL="http://elastic:changeme@localhost:5601"
AUTH="elastic:changeme"

# Generate current timestamp in ISO 8601 UTC format
CURRENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Function to run _update_by_query on given index pattern
update_timestamp() {
  local index_pattern=$1
  echo "Updating @timestamp on '$index_pattern' to '$CURRENT_TIMESTAMP'..."
  
  curl -s -X POST "$ES_URL/$index_pattern/_update_by_query" \
    -u "$AUTH" \
    -H 'Content-Type: application/json' \
    -d "{
      \"script\": {
        \"source\": \"ctx._source['@timestamp'] = '$CURRENT_TIMESTAMP'\",
        \"lang\": \"painless\"
      },
      \"query\": {
        \"match_all\": {}
      }
    }"
  
  echo "Update completed on '$index_pattern'."
  echo
}

echo "Loading ES archives..."

declare -a archives=(
  "contextual_flyout_misconfiguration_findings"
  "contextual_flyout_security_alerts"
  "contextual_flyout_vulnerability_findings"
)

for archive in "${archives[@]}"; do
  echo "Loading $archive..."
  node "$KIBANA_ROOT/scripts/es_archiver" load "$KIBANA_ROOT/x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/$archive" \
    --es-url "$ES_URL" \
    --kibana-url "$KIBANA_URL" \
    --config "$KIBANA_ROOT/src/platform/test/functional/config.base.js"
done

echo "All archives loaded successfully."
echo

# Update timestamps on indices
update_timestamp "security_solution-cloud_security_posture.misconfiguration_latest"
update_timestamp "security_solution-cloud_security_posture.vulnerability_latest"
update_timestamp ".internal.alerts-security.alerts-default*"

echo "All operations completed successfully."
