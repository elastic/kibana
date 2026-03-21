# Incremental Attack Discovery Monitoring Setup

## Quick Start

### 1. Import Dashboard

```bash
# Import the dashboard configuration
POST /api/kibana/dashboards/import
{
  "objects": [
    <paste contents of dashboard_config.json>
  ]
}
```

### 2. Configure Alert Rules

```bash
# Import alert rules
for rule in alert_rules.json:
  POST /api/alerting/rule
  <paste rule configuration>
```

### 3. Access Dashboard

Navigate to: **Kibana → Analytics → Dashboards → Incremental Attack Discovery Monitoring**

---

## Dashboard Panels

### 1. Mode Distribution Over Time
**Purpose**: Track adoption of incremental modes
**Query**: `event.type:incremental_attack_discovery_completed`
**Visualization**: Line chart (mode over time)
**Goal**: See progressive → delta migration

### 2. Context Budget Trend
**Purpose**: Ensure context stays <8K tokens
**Query**: `event.type:incremental_attack_discovery_completed`
**Visualization**: Line chart with threshold lines
**Thresholds**:
- 🔴 8000 tokens (limit)
- 🟠 7000 tokens (warning)
**Alert**: When avgContextBudget > 8000

### 3. Delta Mode Efficiency
**Purpose**: Track delta effectiveness
**Query**: `event.type:incremental_attack_discovery_completed AND mode:delta`
**Visualization**: Gauge
**Formula**: `deltaSize / (deltaSize + previouslyProcessed)`
**Thresholds**:
- 🟢 <20% (good)
- 🟠 20-50% (warning)
- 🔴 >50% (poor)
**Goal**: <20% after initial runs

### 4. Success Rate by Mode and Model
**Purpose**: Track reliability
**Query**: `event.type:(incremental_attack_discovery_completed OR failed)`
**Visualization**: Stacked bar chart
**Breakdown**: By mode and modelId
**Goal**: >95% success rate

### 5. Average Round Duration by Model
**Purpose**: Compare model performance
**Query**: `event.type:incremental_attack_discovery_completed`
**Visualization**: Bar chart
**Field**: `avgRoundDurationMs`
**Goal**: <30s per round

### 6. Insight Merge Rate
**Purpose**: Track deduplication effectiveness
**Query**: `event.type:incremental_attack_discovery_completed`
**Visualization**: Gauge
**Formula**: `mergedInsightCount / totalInsights`
**Thresholds**:
- 🟠 <10% (under-merging)
- 🟢 10-30% (good)
- 🟠 >50% (over-merging)

### 7. Alerts Processed Over Time
**Purpose**: Track volume trends
**Query**: `event.type:incremental_attack_discovery_completed`
**Visualization**: Area chart
**Metrics**: Total alerts, average rounds
**Goal**: Identify usage patterns

### 8. Error Rate by Mode
**Purpose**: Monitor failure patterns
**Query**: `event.type:incremental_attack_discovery_failed`
**Visualization**: Pie chart
**Breakdown**: By mode and error message
**Goal**: <5% failure rate

---

## Alert Rules

### Critical Alerts

#### 1. Context Budget Exceeded
**Trigger**: `contextBudgetPerRound > 8000`
**Severity**: 🔴 Critical
**Actions**:
- Slack notification
- Email to on-call
**Resolution**: Reduce `alertsPerRound` configuration

#### 2. High Failure Rate
**Trigger**: Success rate < 95% over 1 hour
**Severity**: 🔴 High
**Actions**:
- Slack notification
- Create incident
**Resolution**: Check error logs, model availability

### Warning Alerts

#### 3. Delta Inefficiency
**Trigger**: Delta size > 80% for 5 consecutive runs
**Severity**: 🟠 Medium
**Actions**:
- Slack notification
**Resolution**:
- Check schedule frequency
- Verify state persistence
- Check for alert rotation

#### 4. Slow Round Performance
**Trigger**: `avgRoundDurationMs > 30000`
**Severity**: 🟠 Medium
**Actions**:
- Slack notification
**Resolution**:
- Check model performance
- Reduce `alertsPerRound`
- Check network latency

#### 5. Max Rounds Exceeded
**Trigger**: Hitting maxRounds limit 3+ times in 1 hour
**Severity**: 🟠 Medium
**Actions**:
- Slack notification
**Resolution**:
- Increase `maxRounds`
- Reduce alert query size
- Check alert volume spikes

### Quality Alerts (Low Priority)

#### 6. Over-Merging Detection
**Trigger**: Merge rate > 50%
**Severity**: 🔵 Low
**Actions**:
- Slack notification (once per 4h)
**Resolution**: Increase `similarityThreshold` from 0.8 to 0.9

#### 7. Under-Merging Detection (Disabled by default)
**Trigger**: Merge rate < 5%
**Severity**: 🔵 Low
**Actions**:
- Slack notification (once per 4h)
**Resolution**: Decrease `similarityThreshold` from 0.8 to 0.6

---

## Setup Instructions

### Step 1: Enable Telemetry

Ensure telemetry events are being captured:

```typescript
// In plugin setup
telemetry.registerEventTypes([
  {
    eventType: 'incremental_attack_discovery_completed',
    schema: { /* ... */ }
  },
  {
    eventType: 'incremental_attack_discovery_failed',
    schema: { /* ... */ }
  },
  {
    eventType: 'incremental_attack_discovery_round',
    schema: { /* ... */ }
  }
]);
```

Verify events in Dev Tools:

```
GET .kibana-event-log-*/_search
{
  "query": {
    "term": { "event.type": "incremental_attack_discovery_completed" }
  },
  "size": 1,
  "sort": [{ "@timestamp": "desc" }]
}
```

### Step 2: Import Dashboard

1. Go to **Stack Management → Saved Objects**
2. Click **Import**
3. Upload `dashboard_config.json`
4. Resolve any conflicts
5. Navigate to **Dashboards** and find "Incremental Attack Discovery Monitoring"

### Step 3: Configure Alerts

1. Go to **Stack Management → Rules and Connectors**
2. Click **Create rule**
3. For each alert in `alert_rules.json`:
   - Select rule type (Threshold/Anomaly)
   - Configure query and conditions
   - Set up actions (Slack, Email)
   - Enable the rule

### Step 4: Set Up Slack Connector

```bash
# Create Slack connector
POST /api/actions/connector
{
  "name": "Incremental AD Alerts",
  "connector_type_id": ".slack",
  "config": {
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
  }
}
```

### Step 5: Test Alerts

```bash
# Trigger a test alert
POST /api/elastic_assistant/attack_discovery/_generate
{
  "incrementalMode": "progressive",
  "incrementalConfig": {
    "alertsPerRound": 100  # Intentionally high to trigger context budget alert
  },
  # ... other fields ...
}
```

---

## Monitoring Runbook

### Scenario 1: Context Budget Alert Triggered

**Alert**: "Context budget exceeded: 12000 tokens > 8000 limit"

**Investigation**:
```
1. Check telemetry:
   GET /.kibana-event-log-*/_search
   {
     "query": { "term": { "event.type": "incremental_attack_discovery_completed" } },
     "aggs": {
       "avg_context": { "avg": { "field": "contextBudgetPerRound" } },
       "max_context": { "max": { "field": "contextBudgetPerRound" } }
     }
   }

2. Check current configuration:
   - alertsPerRound: [current value]
   - Average alert count per round: [value]

3. Calculate safe alertsPerRound:
   safe_count = 8000 / (100 + overhead)
   ≈ 75 alerts max
```

**Resolution**:
```
Update configuration:
{
  "incrementalConfig": {
    "alertsPerRound": 50  # Reduce from current value
  }
}
```

### Scenario 2: High Failure Rate

**Alert**: "Failure rate > 5% in last hour"

**Investigation**:
```
1. Check error messages:
   GET /.kibana-event-log-*/_search
   {
     "query": { "term": { "event.type": "incremental_attack_discovery_failed" } },
     "size": 10,
     "sort": [{ "@timestamp": "desc" }]
   }

2. Common error patterns:
   - "LLM timeout" → Check model availability
   - "Context exceeded" → Check alertsPerRound
   - "ES connection" → Check Elasticsearch health
```

**Resolution**:
- Model timeout: Increase connector timeout
- Context issue: Reduce alertsPerRound
- ES issue: Check cluster health

### Scenario 3: Delta Inefficiency

**Alert**: "Delta size >80% for 5 consecutive runs"

**Investigation**:
```
1. Check session persistence:
   GET .attack-discovery-incremental-state/_count
   {
     "query": { "term": { "sessionId": "your-session-id" } }
   }

2. Check schedule frequency:
   - Current: Every [X] minutes
   - Alert volume: [Y] alerts/hour
   - Expected delta: [Y * X/60] alerts

3. Check for alert rotation:
   - Are old alerts being deleted?
   - Is index rolling over?
```

**Resolution**:
- If state missing: Check ES write permissions
- If schedule too infrequent: Increase frequency
- If alerts rotating: Adjust time range or accept higher delta

---

## Metrics to Monitor

### Daily Checks

- [ ] Success rate >95%
- [ ] Context budget <8K
- [ ] Delta efficiency <20% (for delta mode)
- [ ] Merge rate 10-30%

### Weekly Reviews

- [ ] Mode adoption trends
- [ ] Performance by model
- [ ] Configuration tuning opportunities
- [ ] Error pattern analysis

### Monthly Reviews

- [ ] Cost savings from delta mode
- [ ] OSS model adoption rate
- [ ] Quality assessment (insight coherence)
- [ ] Capacity planning (round counts trending up?)

---

## Dashboards

### Primary Dashboard
**Name**: Incremental Attack Discovery Monitoring
**URL**: `/app/dashboards#/view/incremental-ad-monitoring`
**Panels**: 8 (mode distribution, context budget, etc.)
**Refresh**: Every 1 minute

### Additional Dashboards (Optional)

**Per-Model Performance**:
- Round duration by model
- Success rate by model
- Context budget by model

**Per-Session Analysis** (Delta Mode):
- Delta size trends
- State persistence health
- Reprocessing efficiency

---

## Integration with Existing Monitoring

### Add to Attack Discovery Dashboard

Add incremental-specific panels to the existing Attack Discovery dashboard:

```json
{
  "title": "Incremental Mode Usage",
  "visualization": {
    "type": "metric",
    "value": "count of incremental runs / total runs"
  }
}
```

### Add to Model Performance Dashboard

Track incremental-specific model metrics:

```json
{
  "title": "Context Budget by Model (Incremental)",
  "filter": "incrementalMode:*",
  "breakdown": "modelId"
}
```

---

## Troubleshooting

### Dashboard Not Showing Data

**Cause**: Telemetry events not being emitted

**Solution**:
1. Check telemetry is enabled in kibana.yml
2. Verify incremental mode is being used
3. Check event log index exists

### Alerts Not Triggering

**Cause**: Connector not configured

**Solution**:
1. Create Slack/Email connector
2. Update alert actions with connector ID
3. Test connector with manual alert

### Metrics Look Wrong

**Cause**: Formula calculation error

**Solution**:
1. Check field names match telemetry schema
2. Verify aggregations are correct
3. Test queries in Dev Tools first

---

## Files

- **Dashboard Config**: `./dashboard_config.json`
- **Alert Rules**: `./alert_rules.json`
- **This Guide**: `./MONITORING_SETUP.md`
- **Telemetry Schema**: `../TELEMETRY.md`

---

## Next Steps

1. ✅ Import dashboard
2. ✅ Configure alerts
3. ✅ Set up Slack connector
4. ✅ Test with sample data
5. ✅ Monitor for 1 week
6. ✅ Tune thresholds based on actual usage
