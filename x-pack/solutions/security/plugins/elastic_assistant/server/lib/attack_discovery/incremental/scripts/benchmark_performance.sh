#!/bin/bash

# Performance benchmark suite for incremental Attack Discovery
#
# Tests latency, throughput, and resource usage
#
# Usage:
#   ./benchmark_performance.sh <connector-id> <model-name>
#
# Example:
#   ./benchmark_performance.sh abc-123 qwen-2.5-7b

set -e

CONNECTOR_ID=$1
MODEL_NAME=$2
KIBANA_URL=${KIBANA_URL:-"http://localhost:5601"}
ES_USER=${ES_USER:-"elastic"}
ES_PASS=${ES_PASS:-"changeme"}

if [ -z "$CONNECTOR_ID" ] || [ -z "$MODEL_NAME" ]; then
  echo "Usage: $0 <connector-id> <model-name>"
  exit 1
fi

echo "╔════════════════════════════════════════════════════════╗"
echo "║ Incremental AD - Performance Benchmarks               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Model: $MODEL_NAME"
echo "Connector: $CONNECTOR_ID"
echo ""

RESULTS_FILE="benchmark_results_$(date +%Y%m%d_%H%M%S).json"
echo "{" > $RESULTS_FILE
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> $RESULTS_FILE
echo "  \"model\": \"$MODEL_NAME\"," >> $RESULTS_FILE
echo "  \"benchmarks\": {" >> $RESULTS_FILE

#######################################
# Benchmark 1: Delta Mode Latency
#######################################
echo "=== Benchmark 1: Delta Mode Latency ==="

SESSION_ID="perf-delta-$(date +%s)"
START=$(date +%s%3N)

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
    \"size\": 50,
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

EXEC_UUID=$(echo $RESPONSE | jq -r '.execution_uuid')
sleep 30  # Wait for completion

END=$(date +%s%3N)
DELTA_LATENCY=$((END - START))

echo "  Latency: ${DELTA_LATENCY}ms"
echo "  Target: <15000ms"

echo "    \"delta_mode_latency\": {" >> $RESULTS_FILE
echo "      \"duration_ms\": $DELTA_LATENCY," >> $RESULTS_FILE
echo "      \"target_ms\": 15000," >> $RESULTS_FILE
echo "      \"status\": \"$([ $DELTA_LATENCY -lt 15000 ] && echo 'PASS' || echo 'FAIL')\"" >> $RESULTS_FILE
echo "    }," >> $RESULTS_FILE

#######################################
# Benchmark 2: Progressive Mode Latency
#######################################
echo ""
echo "=== Benchmark 2: Progressive Mode Latency (200 alerts) ==="

START=$(date +%s%3N)

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

sleep 90  # Progressive takes longer

END=$(date +%s%3N)
PROGRESSIVE_LATENCY=$((END - START))

echo "  Latency: ${PROGRESSIVE_LATENCY}ms"
echo "  Target: <120000ms"

echo "    \"progressive_mode_latency\": {" >> $RESULTS_FILE
echo "      \"duration_ms\": $PROGRESSIVE_LATENCY," >> $RESULTS_FILE
echo "      \"target_ms\": 120000," >> $RESULTS_FILE
echo "      \"status\": \"$([ $PROGRESSIVE_LATENCY -lt 120000 ] && echo 'PASS' || echo 'FAIL')\"" >> $RESULTS_FILE
echo "    }," >> $RESULTS_FILE

#######################################
# Benchmark 3: Standard Mode Baseline
#######################################
echo ""
echo "=== Benchmark 3: Standard Mode Baseline (50 alerts) ==="

START=$(date +%s%3N)

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
    \"size\": 50,
    \"start\": \"now-1h\",
    \"end\": \"now\",
    \"subAction\": \"invokeAI\"
  }")

sleep 20

END=$(date +%s%3N)
STANDARD_LATENCY=$((END - START))

echo "  Latency: ${STANDARD_LATENCY}ms"

echo "    \"standard_mode_latency\": {" >> $RESULTS_FILE
echo "      \"duration_ms\": $STANDARD_LATENCY" >> $RESULTS_FILE
echo "    }," >> $RESULTS_FILE

#######################################
# Benchmark 4: Concurrent Requests
#######################################
echo ""
echo "=== Benchmark 4: Concurrent Requests (5 simultaneous) ==="

START=$(date +%s%3N)

for i in {1..5}; do
  curl -s -X POST "$KIBANA_URL/api/elastic_assistant/attack_discovery/_generate" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -u "$ES_USER:$ES_PASS" \
    -d "{
      \"alertsIndexPattern\": \".alerts-security.alerts-default\",
      \"apiConfig\": {\"connectorId\": \"$CONNECTOR_ID\", \"actionTypeId\": \".gen-ai\"},
      \"anonymizationFields\": [],
      \"size\": 50,
      \"start\": \"now-1h\",
      \"end\": \"now\",
      \"subAction\": \"invokeAI\",
      \"incrementalMode\": \"delta\",
      \"sessionId\": \"perf-concurrent-$i\"
    }" &
done

wait  # Wait for all to complete

END=$(date +%s%3N)
CONCURRENT_DURATION=$((END - START))

echo "  Duration: ${CONCURRENT_DURATION}ms"
echo "  Target: <60000ms (should handle concurrency)"

echo "    \"concurrent_requests\": {" >> $RESULTS_FILE
echo "      \"count\": 5," >> $RESULTS_FILE
echo "      \"duration_ms\": $CONCURRENT_DURATION," >> $RESULTS_FILE
echo "      \"target_ms\": 60000," >> $RESULTS_FILE
echo "      \"status\": \"$([ $CONCURRENT_DURATION -lt 60000 ] && echo 'PASS' || echo 'FAIL')\"" >> $RESULTS_FILE
echo "    }," >> $RESULTS_FILE

#######################################
# Benchmark 5: State Index Growth
#######################################
echo ""
echo "=== Benchmark 5: State Index Size ==="

STATE_SIZE=$(curl -s -X GET "http://localhost:9200/.attack-discovery-incremental-state/_count" \
  -u "$ES_USER:$ES_PASS" | jq '.count')

STATE_DISK=$(curl -s -X GET "http://localhost:9200/_cat/indices/.attack-discovery-incremental-state?format=json" \
  -u "$ES_USER:$ES_PASS" | jq '.[0]["store.size"]')

echo "  Document count: $STATE_SIZE"
echo "  Disk size: $STATE_DISK"

echo "    \"state_index\": {" >> $RESULTS_FILE
echo "      \"document_count\": $STATE_SIZE," >> $RESULTS_FILE
echo "      \"disk_size\": \"$STATE_DISK\"" >> $RESULTS_FILE
echo "    }" >> $RESULTS_FILE

#######################################
# Summary
#######################################
echo "  }" >> $RESULTS_FILE
echo "}" >> $RESULTS_FILE

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║ Benchmark Summary                                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

cat $RESULTS_FILE | jq .

echo ""
echo "Results saved to: $RESULTS_FILE"
echo ""

# Determine overall pass/fail
PASS_COUNT=$(cat $RESULTS_FILE | jq '[.benchmarks[] | select(.status == "PASS")] | length')
TOTAL_COUNT=$(cat $RESULTS_FILE | jq '[.benchmarks[] | select(.status)] | length')

if [ "$PASS_COUNT" -eq "$TOTAL_COUNT" ]; then
  echo "✅ All benchmarks PASSED ($PASS_COUNT/$TOTAL_COUNT)"
  exit 0
else
  echo "⚠️  Some benchmarks FAILED ($PASS_COUNT/$TOTAL_COUNT passed)"
  exit 1
fi
