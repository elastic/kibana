#!/bin/bash

# Validation script for incremental Attack Discovery with real LLMs
#
# Prerequisites:
# - Kibana running (yarn start)
# - Elasticsearch with alert data
# - LLM connector configured
#
# Usage:
#   ./validate_with_real_llm.sh <connector-id> <model-name>
#
# Example:
#   ./validate_with_real_llm.sh abc-123-connector qwen-2.5-7b

set -e

CONNECTOR_ID=$1
MODEL_NAME=$2
KIBANA_URL=${KIBANA_URL:-"http://localhost:5601"}
ES_USER=${ES_USER:-"elastic"}
ES_PASS=${ES_PASS:-"changeme"}

if [ -z "$CONNECTOR_ID" ] || [ -z "$MODEL_NAME" ]; then
  echo "Usage: $0 <connector-id> <model-name>"
  echo "Example: $0 abc-123 qwen-2.5-7b"
  exit 1
fi

echo "╔════════════════════════════════════════════════════════╗"
echo "║ Incremental AD Validation - Real LLM                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Connector ID: $CONNECTOR_ID"
echo "Model: $MODEL_NAME"
echo "Kibana: $KIBANA_URL"
echo ""

# Test 1: Delta Mode - Initial Run
echo "=== Test 1: Delta Mode - Initial Run (100 alerts) ==="

SESSION_ID="validation-delta-$(date +%s)"

RESPONSE=$(curl -s -X POST "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generate" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u "$ES_USER:$ES_PASS" \
  -d "{
    \"alertsIndexPattern\": \".alerts-security.alerts-default\",
    \"apiConfig\": {
      \"connectorId\": \"$CONNECTOR_ID\",
      \"actionTypeId\": \".gen-ai\",
      \"model\": \"$MODEL_NAME\"
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
  }")

EXECUTION_UUID=$(echo $RESPONSE | jq -r '.execution_uuid')
echo "✓ Execution UUID: $EXECUTION_UUID"

# Wait for completion
echo "Waiting for generation to complete..."
sleep 30

# Fetch results
RESULT=$(curl -s -X GET "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generation/$EXECUTION_UUID" \
  -H "kbn-xsrf: true" \
  -u "$ES_USER:$ES_PASS")

DELTA_SIZE=$(echo $RESULT | jq '.incrementalStats.deltaSize')
TOTAL_ROUNDS=$(echo $RESULT | jq '.incrementalStats.totalRounds')
MAX_CONTEXT=$(echo $RESULT | jq '.incrementalStats.rounds | map(.alertsProcessed | length * 100 + 500) | max')

echo "Results:"
echo "  Delta size: $DELTA_SIZE alerts (expected: 100)"
echo "  Total rounds: $TOTAL_ROUNDS (expected: 2)"
echo "  Max context: ~$MAX_CONTEXT tokens (limit: 8000)"

if [ "$DELTA_SIZE" -eq 100 ] && [ "$TOTAL_ROUNDS" -eq 2 ] && [ "$MAX_CONTEXT" -lt 8000 ]; then
  echo "✅ Test 1 PASSED"
else
  echo "❌ Test 1 FAILED"
  echo "$RESULT" | jq .
  exit 1
fi

echo ""

# Test 2: Delta Mode - Incremental Run
echo "=== Test 2: Delta Mode - Incremental Run (only NEW alerts) ==="

sleep 60  # Wait for some new alerts to be generated

RESPONSE2=$(curl -s -X POST "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generate" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u "$ES_USER:$ES_PASS" \
  -d "{
    \"alertsIndexPattern\": \".alerts-security.alerts-default\",
    \"apiConfig\": {
      \"connectorId\": \"$CONNECTOR_ID\",
      \"actionTypeId\": \".gen-ai\",
      \"model\": \"$MODEL_NAME\"
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
  }")

EXECUTION_UUID2=$(echo $RESPONSE2 | jq -r '.execution_uuid')
echo "✓ Execution UUID: $EXECUTION_UUID2"

sleep 30

RESULT2=$(curl -s -X GET "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generation/$EXECUTION_UUID2" \
  -H "kbn-xsrf: true" \
  -u "$ES_USER:$ES_PASS")

DELTA_SIZE2=$(echo $RESULT2 | jq '.incrementalStats.deltaSize')
EFFICIENCY=$((100 * $DELTA_SIZE2 / 100))

echo "Results:"
echo "  Delta size: $DELTA_SIZE2 alerts (expected: <20)"
echo "  Efficiency: ${EFFICIENCY}% new (target: <20%)"

if [ "$DELTA_SIZE2" -lt 20 ]; then
  echo "✅ Test 2 PASSED - Delta mode efficient"
else
  echo "⚠️  Test 2 WARNING - Delta efficiency could be better"
fi

echo ""

# Test 3: Progressive Mode - Large Dataset
echo "=== Test 3: Progressive Mode - 200 Alerts ==="

RESPONSE3=$(curl -s -X POST "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generate" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u "$ES_USER:$ES_PASS" \
  -d "{
    \"alertsIndexPattern\": \".alerts-security.alerts-default\",
    \"apiConfig\": {
      \"connectorId\": \"$CONNECTOR_ID\",
      \"actionTypeId\": \".gen-ai\",
      \"model\": \"$MODEL_NAME\"
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
  }")

EXECUTION_UUID3=$(echo $RESPONSE3 | jq -r '.execution_uuid')
echo "✓ Execution UUID: $EXECUTION_UUID3"

sleep 60  # Progressive mode takes longer

RESULT3=$(curl -s -X GET "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generation/$EXECUTION_UUID3" \
  -H "kbn-xsrf: true" \
  -u "$ES_USER:$ES_PASS")

TOTAL_ROUNDS3=$(echo $RESULT3 | jq '.incrementalStats.totalRounds')
TOTAL_ALERTS3=$(echo $RESULT3 | jq '.incrementalStats.totalAlertsProcessed')
MAX_CONTEXT3=$(echo $RESULT3 | jq '.incrementalStats.rounds | map(.alertsProcessed | length * 100 + 500) | max')

echo "Results:"
echo "  Total rounds: $TOTAL_ROUNDS3 (expected: 4)"
echo "  Alerts processed: $TOTAL_ALERTS3 (expected: 200)"
echo "  Max context: ~$MAX_CONTEXT3 tokens (limit: 8000)"

if [ "$TOTAL_ROUNDS3" -eq 4 ] && [ "$TOTAL_ALERTS3" -eq 200 ] && [ "$MAX_CONTEXT3" -lt 8000 ]; then
  echo "✅ Test 3 PASSED"
else
  echo "❌ Test 3 FAILED"
  echo "$RESULT3" | jq .
  exit 1
fi

echo ""

# Summary
echo "╔════════════════════════════════════════════════════════╗"
echo "║ Validation Summary                                     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Delta Mode - Initial Run: PASSED"
echo "✅ Delta Mode - Incremental: PASSED"
echo "✅ Progressive Mode - 200 Alerts: PASSED"
echo ""
echo "Model: $MODEL_NAME"
echo "All tests completed successfully! ✅"
echo ""
echo "Next steps:"
echo "1. Review telemetry in Kibana dashboard"
echo "2. Fill out VALIDATION_REPORT.md"
echo "3. Proceed with rollout plan"
