# Real LLM Validation Execution Guide

## Overview

This guide explains how to run validation of incremental Attack Discovery with real LLM models.

---

## Prerequisites

### 1. Deploy LLM Model

**Option A: vLLM (Recommended for OSS models)**

```bash
# Deploy Qwen 2.5 7B
cd elastic-llm-benchmarker
./scripts/deploy_model.sh qwen-2.5-7b

# Note the endpoint URL
# Example: http://localhost:8000
```

**Option B: Use Cloud Provider**

- OpenAI (GPT-4o Mini)
- Anthropic (Claude Haiku)
- AWS Bedrock (Llama 3.1 8B)

### 2. Configure Kibana Connector

```bash
# Create Gen AI connector in Kibana
POST /api/actions/connector
{
  "name": "Qwen 2.5 7B - vLLM",
  "connector_type_id": ".gen-ai",
  "config": {
    "apiUrl": "http://localhost:8000/v1/chat/completions",
    "apiProvider": "OpenAI"  # vLLM is OpenAI-compatible
  },
  "secrets": {
    "apiKey": "not-needed-for-local-vllm"
  }
}
```

**Note the connector ID** from the response.

### 3. Verify Alert Data

```bash
# Check you have alerts
GET .alerts-security.alerts-default/_count
{
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-24h"
      }
    }
  }
}

# Should return count > 100 for meaningful testing
```

---

## Running Validation

### Quick Validation (All Scenarios)

```bash
cd x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/incremental/scripts

# Make executable
chmod +x validate_with_real_llm.sh

# Run all tests
./validate_with_real_llm.sh <connector-id> <model-name>

# Example:
./validate_with_real_llm.sh abc-123-connector qwen-2.5-7b
```

**Expected Output**:

```
╔════════════════════════════════════════════════════════╗
║ Incremental AD Validation - Real LLM                  ║
╚════════════════════════════════════════════════════════╝

Connector ID: abc-123-connector
Model: qwen-2.5-7b
Kibana: http://localhost:5601

=== Test 1: Delta Mode - Initial Run (100 alerts) ===
✓ Execution UUID: execution-uuid-1
Waiting for generation to complete...
Results:
  Delta size: 100 alerts (expected: 100)
  Total rounds: 2 (expected: 2)
  Max context: ~5500 tokens (limit: 8000)
✅ Test 1 PASSED

=== Test 2: Delta Mode - Incremental Run (only NEW alerts) ===
✓ Execution UUID: execution-uuid-2
Results:
  Delta size: 15 alerts (expected: <20)
  Efficiency: 15% new (target: <20%)
✅ Test 2 PASSED - Delta mode efficient

=== Test 3: Progressive Mode - 200 Alerts ===
✓ Execution UUID: execution-uuid-3
Results:
  Total rounds: 4 (expected: 4)
  Alerts processed: 200 (expected: 200)
  Max context: ~7000 tokens (limit: 8000)
✅ Test 3 PASSED

╔════════════════════════════════════════════════════════╗
║ Validation Summary                                     ║
╚════════════════════════════════════════════════════════╝

✅ Delta Mode - Initial Run: PASSED
✅ Delta Mode - Incremental: PASSED
✅ Progressive Mode - 200 Alerts: PASSED

Model: qwen-2.5-7b
All tests completed successfully! ✅

Next steps:
1. Review telemetry in Kibana dashboard
2. Fill out VALIDATION_REPORT.md
3. Proceed with rollout plan
```

### Manual Testing (Individual Scenarios)

#### Test 1: Delta Mode - Day 1

```bash
curl -X POST "http://localhost:5601/api/elastic_assistant/attack_discovery/_generate" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "alertsIndexPattern": ".alerts-security.alerts-default",
    "apiConfig": {
      "connectorId": "YOUR_CONNECTOR_ID",
      "actionTypeId": ".gen-ai",
      "model": "qwen-2.5-7b"
    },
    "anonymizationFields": [],
    "size": 100,
    "start": "now-24h",
    "end": "now",
    "subAction": "invokeAI",
    "incrementalMode": "delta",
    "sessionId": "test-delta-session",
    "incrementalConfig": {
      "alertsPerRound": 50,
      "maxRounds": 10
    }
  }' | jq .

# Note the execution_uuid, then fetch results:
curl -X GET "http://localhost:5601/api/elastic_assistant/attack_discovery/_generation/<execution-uuid>" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme | jq '.incrementalStats'
```

**Verify**:
- `deltaSize` = 100 (all processed on first run)
- `totalRounds` = 2 (100/50)
- All rounds have context <8K tokens

#### Test 2: Delta Mode - Day 2

```bash
# Wait 5 minutes or generate new alerts, then:
curl -X POST "http://localhost:5601/api/elastic_assistant/attack_discovery/_generate" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "alertsIndexPattern": ".alerts-security.alerts-default",
    "apiConfig": {
      "connectorId": "YOUR_CONNECTOR_ID",
      "actionTypeId": ".gen-ai",
      "model": "qwen-2.5-7b"
    },
    "anonymizationFields": [],
    "size": 100,
    "start": "now-24h",
    "end": "now",
    "subAction": "invokeAI",
    "incrementalMode": "delta",
    "sessionId": "test-delta-session",  # Same session!
    "incrementalConfig": {
      "alertsPerRound": 50,
      "maxRounds": 10
    }
  }' | jq '.incrementalStats'
```

**Verify**:
- `deltaSize` < 20 (only new alerts)
- `totalRounds` = 1 (delta is small)
- Efficiency: `deltaSize / size` < 20%

#### Test 3: Progressive Mode

```bash
curl -X POST "http://localhost:5601/api/elastic_assistant/attack_discovery/_generate" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "alertsIndexPattern": ".alerts-security.alerts-default",
    "apiConfig": {
      "connectorId": "YOUR_CONNECTOR_ID",
      "actionTypeId": ".gen-ai",
      "model": "qwen-2.5-7b"
    },
    "anonymizationFields": [],
    "size": 200,
    "start": "now-7d",
    "end": "now",
    "subAction": "invokeAI",
    "incrementalMode": "progressive",
    "incrementalConfig": {
      "alertsPerRound": 50,
      "maxRounds": 5
    }
  }' | jq '.incrementalStats'
```

**Verify**:
- `totalRounds` = 4 (200/50)
- `totalAlertsProcessed` = 200
- Each round context <8K tokens

---

## Validation Checklist

### Functional Validation

Run the automated script and verify:

- [ ] Delta mode processes all alerts on first run
- [ ] Delta mode processes only new alerts on subsequent runs
- [ ] Progressive mode handles 200+ alerts in bounded rounds
- [ ] Context stays <8K tokens in all scenarios
- [ ] Insights are coherent (not fragmented)
- [ ] Alert IDs are valid (no hallucinations)

### Performance Validation

Monitor telemetry dashboard:

- [ ] Average round duration: <30s
- [ ] Total duration (200 alerts): <2 minutes
- [ ] Delta efficiency: <20% after initial run
- [ ] Success rate: >95%

### Quality Validation

Review generated insights:

- [ ] Narratives are coherent across rounds
- [ ] No contradictory statements
- [ ] Progressive refinement visible
- [ ] Alert IDs correctly referenced
- [ ] MITRE ATT&CK tactics appropriate

### Model Compatibility

Test with multiple models:

- [ ] Qwen 2.5 7B (32K context)
- [ ] Llama 3.1 8B (128K context)
- [ ] Llama 3.3 70B (128K context)
- [ ] GPT-4o Mini (128K context)

---

## Troubleshooting

### Issue: Validation script fails with "connector not found"

**Solution**:
```bash
# List connectors
curl -X GET "http://localhost:5601/api/actions/connectors" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme | jq '.[] | {id, name, connector_type_id}'

# Use the correct connector ID
```

### Issue: No alerts found

**Solution**:
```bash
# Generate test alerts
node x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/data_generator_rule/generate_alerts.js

# Or use different time range (now-7d)
```

### Issue: Context budget exceeded

**Solution**:
```bash
# Reduce alertsPerRound
{
  "incrementalConfig": {
    "alertsPerRound": 30  # Reduce from 50
  }
}
```

### Issue: Delta mode not filtering

**Solution**:
```bash
# Check state tracker index
GET .attack-discovery-incremental-state/_search
{
  "query": { "term": { "sessionId": "your-session-id" } }
}

# If empty, verify sessionId is consistent
```

---

## Results Documentation

After running validation, document results in:

1. **VALIDATION_REPORT.md** - Fill in all metrics
2. **Telemetry Dashboard** - Screenshot key panels
3. **Slack/Email** - Share results with team

---

## Automated CI Validation (Future)

```yaml
# .buildkite/pipeline.yml
steps:
  - label: "Validate Incremental AD with Qwen 2.5 7B"
    command: |
      # Deploy vLLM
      ./scripts/ci/deploy_vllm.sh qwen-2.5-7b

      # Run validation
      cd x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/incremental/scripts
      ./validate_with_real_llm.sh $CONNECTOR_ID qwen-2.5-7b

    agents:
      queue: "kibana-tests"
    timeout_in_minutes: 30
```

---

## Files

- **Validation Script**: `./validate_with_real_llm.sh`
- **This Guide**: `./VALIDATION_EXECUTION_GUIDE.md`
- **Report Template**: `../VALIDATION_REPORT.md`
- **Validation Doc**: `../VALIDATION.md`
