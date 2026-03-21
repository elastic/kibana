#!/bin/bash

# Sample API requests for incremental Attack Discovery
#
# Usage: Source this file to get helper functions
#   source sample_requests.sh
#   test_delta_mode <connector-id>
#   test_progressive_mode <connector-id>

KIBANA_URL=${KIBANA_URL:-"http://localhost:5601"}
ES_USER=${ES_USER:-"elastic"}
ES_PASS=${ES_PASS:-"changeme"}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

#######################################
# Test Delta Mode (Initial Run)
#######################################
test_delta_mode() {
  local CONNECTOR_ID=$1
  local SESSION_ID=${2:-"test-delta-$(date +%s)"}

  echo -e "${GREEN}Testing Delta Mode - Initial Run${NC}"
  echo "Session ID: $SESSION_ID"

  curl -X POST "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generate" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -u "$ES_USER:$ES_PASS" \
    -d "{
      \"alertsIndexPattern\": \".alerts-security.alerts-default\",
      \"apiConfig\": {
        \"connectorId\": \"$CONNECTOR_ID\",
        \"actionTypeId\": \".gen-ai\",
        \"model\": \"qwen-2.5-7b\"
      },
      \"anonymizationFields\": [],
      \"size\": 100,
      \"start\": \"now-24h\",
      \"end\": \"now\",
      \"subAction\": \"invokeAI\",
      \"incrementalMode\": \"delta\",
      \"sessionId\": \"$SESSION_ID\",
      \"incrementalConfig\": {
        \"alertsPerRound\": 50,
        \"maxRounds\": 10,
        \"mergeStrategy\": \"rule-based\",
        \"similarityThreshold\": 0.8
      }
    }" | jq .

  echo ""
  echo -e "${YELLOW}Remember the session ID for incremental testing: $SESSION_ID${NC}"
}

#######################################
# Test Delta Mode (Incremental Run)
#######################################
test_delta_incremental() {
  local CONNECTOR_ID=$1
  local SESSION_ID=$2

  if [ -z "$SESSION_ID" ]; then
    echo -e "${RED}Error: SESSION_ID required for incremental test${NC}"
    echo "Usage: test_delta_incremental <connector-id> <session-id>"
    return 1
  fi

  echo -e "${GREEN}Testing Delta Mode - Incremental Run${NC}"
  echo "Session ID: $SESSION_ID (reusing from previous run)"

  curl -X POST "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generate" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -u "$ES_USER:$ES_PASS" \
    -d "{
      \"alertsIndexPattern\": \".alerts-security.alerts-default\",
      \"apiConfig\": {
        \"connectorId\": \"$CONNECTOR_ID\",
        \"actionTypeId\": \".gen-ai\",
        \"model\": \"qwen-2.5-7b\"
      },
      \"anonymizationFields\": [],
      \"size\": 100,
      \"start\": \"now-24h\",
      \"end\": \"now\",
      \"subAction\": \"invokeAI\",
      \"incrementalMode\": \"delta\",
      \"sessionId\": \"$SESSION_ID\",
      \"incrementalConfig\": {
        \"alertsPerRound\": 50,
        \"maxRounds\": 10
      }
    }" | jq '.incrementalStats'

  echo ""
  echo -e "${YELLOW}Check deltaSize - should be much smaller than first run${NC}"
}

#######################################
# Test Progressive Mode
#######################################
test_progressive_mode() {
  local CONNECTOR_ID=$1

  echo -e "${GREEN}Testing Progressive Mode - 200 Alerts${NC}"

  curl -X POST "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generate" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -u "$ES_USER:$ES_PASS" \
    -d "{
      \"alertsIndexPattern\": \".alerts-security.alerts-default\",
      \"apiConfig\": {
        \"connectorId\": \"$CONNECTOR_ID\",
        \"actionTypeId\": \".gen-ai\",
        \"model\": \"qwen-2.5-7b\"
      },
      \"anonymizationFields\": [],
      \"size\": 200,
      \"start\": \"now-7d\",
      \"end\": \"now\",
      \"subAction\": \"invokeAI\",
      \"incrementalMode\": \"progressive\",
      \"incrementalConfig\": {
        \"alertsPerRound\": 50,
        \"maxRounds\": 5
      }
    }" | jq .

  echo ""
  echo -e "${YELLOW}Should process in 4 rounds (200/50)${NC}"
}

#######################################
# Test Context Boundary (75 alerts)
#######################################
test_context_boundary() {
  local CONNECTOR_ID=$1

  echo -e "${GREEN}Testing Context Boundary - 75 Alerts/Round${NC}"

  curl -X POST "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generate" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -u "$ES_USER:$ES_PASS" \
    -d "{
      \"alertsIndexPattern\": \".alerts-security.alerts-default\",
      \"apiConfig\": {
        \"connectorId\": \"$CONNECTOR_ID\",
        \"actionTypeId\": \".gen-ai\",
        \"model\": \"qwen-2.5-7b\"
      },
      \"anonymizationFields\": [],
      \"size\": 75,
      \"start\": \"now-24h\",
      \"end\": \"now\",
      \"subAction\": \"invokeAI\",
      \"incrementalMode\": \"progressive\",
      \"incrementalConfig\": {
        \"alertsPerRound\": 75,
        \"maxRounds\": 1
      }
    }" | jq '.incrementalStats'

  echo ""
  echo -e "${YELLOW}Context should be ~8000 tokens (at boundary)${NC}"
}

#######################################
# Test Standard Mode (Comparison)
#######################################
test_standard_mode() {
  local CONNECTOR_ID=$1

  echo -e "${GREEN}Testing Standard Mode - For Comparison${NC}"

  curl -X POST "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generate" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -u "$ES_USER:$ES_PASS" \
    -d "{
      \"alertsIndexPattern\": \".alerts-security.alerts-default\",
      \"apiConfig\": {
        \"connectorId\": \"$CONNECTOR_ID\",
        \"actionTypeId\": \".gen-ai\",
        \"model\": \"qwen-2.5-7b\"
      },
      \"anonymizationFields\": [],
      \"size\": 50,
      \"start\": \"now-1h\",
      \"end\": \"now\",
      \"subAction\": \"invokeAI\"
    }" | jq .

  echo ""
  echo -e "${YELLOW}Standard mode for comparison (no incremental fields)${NC}"
}

#######################################
# Fetch Results by Execution UUID
#######################################
fetch_results() {
  local EXECUTION_UUID=$1

  if [ -z "$EXECUTION_UUID" ]; then
    echo -e "${RED}Usage: fetch_results <execution-uuid>${NC}"
    return 1
  fi

  curl -X GET "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generation/$EXECUTION_UUID" \
    -H "kbn-xsrf: true" \
    -u "$ES_USER:$ES_PASS" | jq .
}

#######################################
# Check State Tracker Index
#######################################
check_state_tracker() {
  local SESSION_ID=$1

  echo -e "${GREEN}Checking State Tracker for Session: $SESSION_ID${NC}"

  curl -X GET "http://localhost:9200/.attack-discovery-incremental-state/_search" \
    -H "Content-Type: application/json" \
    -u "$ES_USER:$ES_PASS" \
    -d "{
      \"query\": {
        \"term\": {
          \"sessionId\": \"$SESSION_ID\"
        }
      },
      \"size\": 100
    }" | jq '.hits.hits | length as $count | "Processed alerts for session: \($count)"'
}

#######################################
# View Telemetry Events
#######################################
view_telemetry() {
  echo -e "${GREEN}Recent Incremental AD Telemetry Events${NC}"

  curl -X GET "http://localhost:9200/.kibana-event-log-*/_search" \
    -H "Content-Type: application/json" \
    -u "$ES_USER:$ES_PASS" \
    -d '{
      "query": {
        "prefix": {
          "event.type": "incremental_attack_discovery"
        }
      },
      "size": 10,
      "sort": [{ "@timestamp": "desc" }]
    }' | jq '.hits.hits[]._source | {
      timestamp: ."@timestamp",
      type: .event.type,
      mode: .mode,
      rounds: .totalRounds,
      alerts: .totalAlertsProcessed,
      deltaSize: .deltaSize,
      context: .contextBudgetPerRound,
      success: .success
    }'
}

#######################################
# Help
#######################################
show_help() {
  echo "Incremental Attack Discovery - Sample Requests"
  echo ""
  echo "Available functions:"
  echo "  test_delta_mode <connector-id> [session-id]"
  echo "  test_delta_incremental <connector-id> <session-id>"
  echo "  test_progressive_mode <connector-id>"
  echo "  test_context_boundary <connector-id>"
  echo "  test_standard_mode <connector-id>"
  echo "  fetch_results <execution-uuid>"
  echo "  check_state_tracker <session-id>"
  echo "  view_telemetry"
  echo ""
  echo "Example workflow:"
  echo "  1. source sample_requests.sh"
  echo "  2. test_delta_mode abc-123"
  echo "  3. # Wait 5 minutes"
  echo "  4. test_delta_incremental abc-123 test-delta-<timestamp>"
  echo "  5. test_progressive_mode abc-123"
  echo "  6. view_telemetry"
}

# Show help on source
echo "Incremental AD sample requests loaded!"
echo "Run 'show_help' for available functions"
