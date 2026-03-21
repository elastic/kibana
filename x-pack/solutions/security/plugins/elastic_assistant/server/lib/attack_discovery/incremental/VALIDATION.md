# Incremental Attack Discovery Validation Guide

## Overview

This guide explains how to validate the incremental Attack Discovery implementation with real LLMs and alert datasets.

## Prerequisites

### 1. Environment Setup

```bash
# Ensure Kibana is running
yarn start

# Verify Elasticsearch is accessible
curl -X GET "localhost:9200/_cluster/health"

# Check connector is configured
curl -X GET "localhost:5601/api/actions/connectors" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

### 2. LLM Access

**Option A: Use vLLM (Recommended for OSS models)**

```bash
# Deploy Qwen 2.5 7B
cd elastic-llm-benchmarker
./deploy_model.sh qwen-2.5-7b

# Note connector ID and model name
```

**Option B: Use External Provider**

- OpenAI (GPT-4o Mini)
- Anthropic (Claude Haiku)
- Bedrock (Llama 3.1 8B)

### 3. Test Data

**Option A: Use Real Alerts**

Ensure you have security alerts in your cluster:

```bash
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
```

**Option B: Generate Mock Alerts**

```bash
# Run alert generator
node x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/data_generator_rule/generate_alerts.js
```

## Running Validation

### Quick Validation (Mock LLM)

Tests the infrastructure without real API calls:

```bash
cd x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/incremental

# Run with mock LLM
node -r ts-node/register scripts/run_validation.ts --mock
```

**Expected Output**:

```
╔════════════════════════════════════════════════════════╗
║ Incremental Attack Discovery Validation Suite         ║
╚════════════════════════════════════════════════════════╝

Mode: Mock LLM
Scenarios: 5

=== Running: Delta Mode - Day 1 (Initial Run) ===
✅ PASSED
   Rounds: 2
   Alerts processed: 100
   Delta size: 100
   Max context: 5500 tokens
   Duration: 245ms

[... other scenarios ...]

╔════════════════════════════════════════════════════════╗
║ Validation Summary                                     ║
╚════════════════════════════════════════════════════════╝

Total scenarios: 5
✅ Passed: 5
❌ Failed: 0

Success rate: 100.0%

Aggregate Metrics:
  Total rounds: 12
  Total alerts: 640
  Avg max context: 6234 tokens
  Context limit: 8000 tokens
  Within budget: ✅
```

### Full Validation (Real LLM)

Tests with actual LLM (requires connector):

```bash
# Get connector ID from Kibana
CONNECTOR_ID=$(curl -s "localhost:5601/api/actions/connectors" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme | jq -r '.[0].id')

# Run validation with real model
node -r ts-node/register scripts/run_validation.ts \
  --connector-id=$CONNECTOR_ID \
  --model=qwen-2.5-7b
```

### Manual API Testing

Test via the Kibana API directly:

#### Test 1: Delta Mode - Initial Run

```bash
curl -X POST "localhost:5601/api/elastic_assistant/attack_discovery/_generate" \
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
    "size": 100,
    "start": "now-24h",
    "end": "now",
    "incrementalMode": "delta",
    "sessionId": "validation-delta-1",
    "incrementalConfig": {
      "alertsPerRound": 50,
      "maxRounds": 10
    }
  }'
```

**Verify**:
- Response contains `incrementalStats`
- `deltaSize` equals total alerts (first run)
- `totalRounds` is 2 (100/50)

#### Test 2: Delta Mode - Incremental Run

Wait 5 minutes, then run same request:

```bash
# Same request as above
```

**Verify**:
- `deltaSize` is small (<20 alerts if no new activity)
- Only new alerts processed
- Insights merged with previous run

#### Test 3: Progressive Mode - Large Dataset

```bash
curl -X POST "localhost:5601/api/elastic_assistant/attack_discovery/_generate" \
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
    "size": 200,
    "start": "now-7d",
    "end": "now",
    "incrementalMode": "progressive",
    "incrementalConfig": {
      "alertsPerRound": 50,
      "maxRounds": 5
    }
  }'
```

**Verify**:
- `totalRounds` is 4 (200/50)
- Each round in `rounds[]` array
- Context budget reported in telemetry

## Validation Checklist

### Functional Validation

- [ ] Delta mode filters to new alerts only
- [ ] Progressive mode processes all alerts in rounds
- [ ] State tracking persists across runs
- [ ] Insights properly merged (no duplicates)
- [ ] Alert IDs deduplicated
- [ ] Error handling works correctly

### Performance Validation

- [ ] Context stays <8K tokens per round
- [ ] Delta efficiency <20% after initial run
- [ ] Round duration <30s average
- [ ] Total duration scales linearly with rounds
- [ ] Memory usage stable across rounds

### Quality Validation

- [ ] Insights are coherent narratives
- [ ] No fragmentation across rounds
- [ ] Progressive refinement visible
- [ ] Alert IDs correctly referenced
- [ ] No hallucinated alerts

### Model Compatibility

Test with multiple models:

- [ ] **Qwen 2.5 7B** (32K context)
  - Delta mode: [X]% success
  - Progressive mode: [X]% success

- [ ] **Llama 3.1 8B** (128K context)
  - Delta mode: [X]% success
  - Progressive mode: [X]% success

- [ ] **Llama 3.3 70B** (128K context)
  - Delta mode: [X]% success
  - Progressive mode: [X]% success

### Telemetry Validation

- [ ] Events appear in Kibana analytics
- [ ] All fields populated correctly
- [ ] No sensitive data leaked
- [ ] Per-round telemetry accurate

## Troubleshooting

### Issue: Context overflow despite incremental mode

**Symptoms**:
```
Error: Context budget exceeded: 12000 tokens > 8000 limit
```

**Diagnosis**:
```bash
# Check telemetry for context budget
GET /.kibana-event-log-*/_search
{
  "query": {
    "term": { "event.type": "incremental_attack_discovery_round" }
  },
  "sort": [{ "@timestamp": "desc" }],
  "size": 1
}
```

**Solution**: Reduce `alertsPerRound` from 50 to 30

### Issue: Delta mode reprocessing alerts

**Symptoms**:
- `deltaSize` consistently equals total alerts
- No efficiency gain

**Diagnosis**:
```bash
# Check state tracker index
GET .attack-discovery-incremental-state/_search
{
  "query": {
    "term": { "sessionId": "your-session-id" }
  }
}
```

**Solution**:
- Verify sessionId is consistent across runs
- Check if state index is being cleared
- Verify ES client has write permissions

### Issue: Insights fragmented

**Symptoms**:
- Many small insights instead of coherent narratives
- Duplicate topics across insights

**Diagnosis**:
```bash
# Check merge rate in telemetry
# Target: 10-30%
```

**Solution**:
- Lower `similarityThreshold` from 0.8 to 0.6
- Increase `alertsPerRound` to give more context

### Issue: High failure rate

**Symptoms**:
- Success rate <80%
- Frequent timeout errors

**Diagnosis**:
```bash
# Check error telemetry
GET /.kibana-event-log-*/_search
{
  "query": {
    "term": { "event.type": "incremental_attack_discovery_failed" }
  }
}
```

**Solution**:
- Check LLM availability
- Increase timeout in connector config
- Reduce `alertsPerRound` to lower complexity

## Validation Report

After completing validation, fill out `VALIDATION_REPORT.md` with:

1. All scenario results (metrics, status)
2. Model compatibility matrix
3. Performance benchmarks
4. Issues found
5. Recommendations

**Template**: See [VALIDATION_REPORT.md](./VALIDATION_REPORT.md)

## Success Criteria

For validation to pass, ALL must be true:

✅ **Context Budget**
- Every round <8K tokens
- No context overflow errors
- Average context ~5-6K tokens

✅ **Delta Efficiency**
- Delta size <20% of total alerts (after initial run)
- State tracking persistent across runs
- No reprocessing of old alerts

✅ **Progressive Scaling**
- Handles 200+ alerts successfully
- Context grows progressively (not linearly)
- All rounds complete within budget

✅ **Quality**
- Insights are coherent narratives
- No fragmentation across rounds
- Alert IDs valid (no hallucinations)
- Proper merging (10-30% merge rate)

✅ **Performance**
- Average round: <30s
- Total duration: <2 minutes (for 200 alerts)
- Success rate: >95% with small models

✅ **Model Compatibility**
- 100% success with Qwen 2.5 7B
- 100% success with Llama 3.1 8B
- Works with any model >8K context

## Resources

- **Validation scenarios**: `./__tests__/validation_scenarios.ts`
- **Validation runner**: `./scripts/run_validation.ts`
- **Report template**: `./VALIDATION_REPORT.md`
- **Telemetry docs**: `./TELEMETRY.md`
- **API reference**: `./API.md`
