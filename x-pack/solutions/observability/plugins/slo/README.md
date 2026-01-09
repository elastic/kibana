# SLOs

A Kibana plugin

---

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.

## Scripts

<dl>
  <dt><code>yarn kbn bootstrap</code></dt>
  <dd>Execute this to install node_modules and setup the dependencies in your plugin and in Kibana</dd>

  <dt><code>yarn plugin-helpers build</code></dt>
  <dd>Execute this to create a distributable version of this plugin that can be installed in Kibana</dd>

  <dt><code>yarn plugin-helpers dev --watch</code></dt>
    <dd>Execute this to build your plugin ui browser side so Kibana could pick up when started in development</dd>
</dl>

## API Integration Tests

The SLO tests are located under `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/slo` folder. In order to run the SLO tests of your interest, you can grep accordingly. Use the commands below to run all SLO tests (`grep=SLO`) on stateful or serverless.

### Stateful

```
# start server
node scripts/functional_tests_server --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.stateful.config.ts

# run tests
node scripts/functional_test_runner --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.stateful.config.ts --grep=SLO
```

### Serverless

```
# start server
node scripts/functional_tests_server --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/serverless/oblt.serverless.config.ts

# run tests
node scripts/functional_test_runner --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/serverless/oblt.serverless.config.ts --grep=SLO
```

---

## 🧠 Core Concepts

**Good Events**: Events that meet your success criteria

- For availability: Successful requests (2xx, 3xx status codes)
- For latency: Requests under your threshold (e.g., < 500ms)

**Total Events**: All events that occurred

- For availability: All requests
- For latency: All requests

**SLI (Service Level Indicator)**: The calculated ratio

```
SLI = Good Events / Total Events
```

**Target**: Your objective (e.g., 99.9% = 0.999)

**Error Budget**: The allowed failure rate

```
Error Budget = 1 - Target
```

Example: 99.9% target = 0.1% error budget

**Burn Rate**: How fast you're consuming your error budget

```
Burn Rate = Error Rate / Error Budget
```

- Burn Rate = 1: Consuming budget at the expected rate
- Burn Rate > 1: Consuming budget faster than expected (alert!)
- Burn Rate < 1: Performing better than target

---

## ⏲️ Time Windows

**Rolling Time Window**

- Moving window that looks back from current time
- Supported durations: 7d, 30d, 90d
- Example: "Last 30 days" - constantly updating

**Calendar Aligned Time Window**

- Aligns to calendar boundaries
- Supported durations: 1w (weekly), 1M (monthly)
- Example: "This month" - resets at month start

---

## 💸 Budgeting Methods

**Occurrences Budgeting**

- Based on count of events
- Formula: `SLI = Good Events / Total Events`
- Use case: Request-based metrics

**Timeslices Budgeting**

- Divides time window into slices
- Each slice is evaluated as good/bad
- Formula: `SLI = 1 - (Bad Slices / Total Slices in Window)`
- Use case: Uptime, compliance windows
- Example: 5-minute slices over a 7-day window = 2,016 slices

---

## 📈 Indicator Types

1. **APM Transaction Error Rate** (APM Availability)

   - Measures successful vs. failed transactions
   - Based on `event.outcome` field

2. **APM Transaction Duration** (APM Latency)

   - Measures if transactions complete under a threshold
   - Example: 99% under 500ms

3. **Custom KQL Query**

   - Use Kibana Query Language to define good/total events
   - Most flexible option

4. **Custom Metric**

   - Based on metric aggregations (sum, avg, etc.)
   - Example: Processed events / Total events

5. **Histogram Metric**

   - Uses histogram fields for latency calculations
   - Efficient for pre-aggregated data

6. **Timeslice Metric**

   - For compliance/uptime scenarios
   - Each time slice evaluated independently

7. **Synthetics**
   - Based on Elastic Synthetics monitoring
   - Tracks availability of synthetic checks

---

## 📊 Key Terminology

### What are SLOs?

**Service Level Objectives (SLOs)** are measurable targets that define the expected level of service reliability. They answer the question: _"What percentage of time should our service meet performance expectations?"_

### The SRE Context

- **SLI (Service Level Indicator)**: The actual measurement (e.g., 99.5% of requests succeeded)
- **SLO (Service Level Objective)**: The target we aim for (e.g., 99.9% availability)
- **SLA (Service Level Agreement)**: The contractual obligation with consequences if not met

### Why SLOs Matter

- **Balance reliability and velocity**: Know when you can ship faster vs. when you need to focus on reliability
- **Error budgets**: If your SLO is 99.9%, you have a 0.1% error budget to "spend"
- **Data-driven decisions**: Objective measures replace subjective discussions
- **Alerting**: Get notified when you're burning through your error budget too quickly

### Budgeting Methods

1. Occurrences: Based on individual event success/failure
2. Timeslices: Based on time window compliance

### Time Windows

1. Rolling: Continuously moving window (e.g., last 30 days)
2. Calendar-Aligned: Fixed calendar periods (e.g., monthly)

### SLO States

- **HEALTHY**: Meeting objective
- **DEGRADING**: Currently under objective for calendar aligned SLO
- **VIOLATED**: Below objective

### Burn Rate

- Burn Rate measures how quickly the error budget is getting exhausted, indicating if SLOs are at risk before end-of-period totals are breached.
- This enables early, responsive alerting for incidents

---

## 🧮 Calculation Logic

### SLI Calculation

#### For Occurrences Budgeting

```typescript
function computeSLI(good: number, total: number): number {
  if (total === 0) {
    return -1; // No data
  }
  return good / total;
}
```

**Example**:

```
Good: 9,900 requests
Total: 10,000 requests
SLI: 9,900 / 10,000 = 0.99 (99%)
```

#### For Timeslices Budgeting

```typescript
function computeSLI(
  good: number, // Count of good slices observed
  total: number, // Count of total slices observed
  totalSlicesInRange: number // Total slices in window (e.g., 2,016 for 7d/5m)
): number {
  // Key insight: Missing slices are considered GOOD
  const badSlices = total - good;
  return 1 - badSlices / totalSlicesInRange;
}
```

**Example**:

```
Time window: 7 days
Slice window: 5 minutes
Total possible slices: 2,016

Observed slices: 1,800 (some data missing)
Good slices: 1,750
Bad slices: 50

SLI = 1 - (50 / 2,016) = 1 - 0.0248 = 0.9752 (97.52%)
```

**Why missing data is "good"**: Conservative approach - assumes service was healthy during missing data periods.

### Error Budget Calculation

```typescript
function computeErrorBudget(target: number, sliValue: number) {
  const initialErrorBudget = 1 - target;
  const consumedErrorBudget = 1 - sliValue;
  const remainingErrorBudget = initialErrorBudget - consumedErrorBudget;

  return {
    initial: initialErrorBudget,
    consumed: consumedErrorBudget,
    remaining: remainingErrorBudget,
    remainingPercentage: (remainingErrorBudget / initialErrorBudget) * 100,
  };
}
```

**Example**:

```
Target: 99.9% (0.999)
SLI: 99.5% (0.995)

Initial error budget: 1 - 0.999 = 0.001 (0.1%)
Consumed: 1 - 0.995 = 0.005 (0.5%)
Remaining: 0.001 - 0.005 = -0.004 (-0.4%)
→ Over budget! ⚠️
```

**With events**:

```
Total events: 1,000,000
Target: 99.9%
Error budget: 0.1% = 1,000 allowed failures

Actual failures: 5,000
Budget remaining: 1,000 - 5,000 = -4,000
→ 400% over budget!
```

### Burn Rate Calculation

**Burn Rate** tells you how fast you're consuming your error budget.

```typescript
function computeBurnRate(target: number, sliValue: number): number {
  if (sliValue >= 1) {
    return 0; // Perfect performance
  }

  const errorBudget = 1 - target;
  const errorRate = 1 - sliValue;

  return errorRate / errorBudget;
}
```

**Example 1: Healthy Service**

```
Target: 99.9% (0.999)
SLI: 99.95% (0.9995)

Error budget: 0.001 (0.1%)
Error rate: 0.0005 (0.05%)
Burn rate: 0.0005 / 0.001 = 0.5

→ Consuming budget at 50% of allowed rate ✓
```

**Example 2: Service Under Stress**

```
Target: 99.9% (0.999)
SLI: 99% (0.99)

Error budget: 0.001 (0.1%)
Error rate: 0.01 (1%)
Burn rate: 0.01 / 0.001 = 10

→ Consuming budget 10× faster than allowed! ⚠️
```

**Burn Rate Interpretation**:

- **< 1**: Under budget (good!)
- **= 1**: On track to exactly hit target
- **> 1**: Over budget (problem!)
- **>> 1** (e.g., 10+): Rapid consumption (incident!)

### Multi-Window Burn Rates

SLOs track burn rates over multiple time windows for smarter alerting:

```typescript
{
  oneHourBurnRate: 14.4,   // Last hour
  fiveMinuteBurnRate: 20.1, // Last 5 min
  oneDayBurnRate: 2.5      // Last day
}
```

**Alert logic** (simplified):

```
IF oneHourBurnRate > 14.4 AND fiveMinuteBurnRate > 14.4:
  → Fast burn detected (alert: critical)

IF oneDayBurnRate > 6 AND oneHourBurnRate > 3:
  → Medium burn detected (alert: high)
```

This prevents alert fatigue from short spikes while catching sustained issues.

---

## 🏛️ SLO Architecture in Kibana

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SLO DATA FLOW ARCHITECTURE                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   Source Data   │  (e.g., APM logs, metrics, custom indices)
│   (your-index)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     Queries source data continuously (every 1m)
│  Rollup         │     Aggregates good/bad events into time buckets
│  Transform      │     Groups by SLO ID, timestamp, and optional groupBy fields
└────────┬────────┘
         │
         │ dest.pipeline: "slo-{sloId}-{revision}"
         ▼
┌─────────────────────────────────────────────────────────────┐
│              SLI INGEST PIPELINE (Rollup Pipeline)          │
│   slo-{sloId}-{revision}                                    │
│                                                             │
│   1. Set _id, event.ingested, slo.id, slo.name, etc.        │
│   2. Route to correct monthly index                         │
│   3. Generate slo.instanceId                                │
│   4. ──► CALL slo-{sloId}@custom (per-SLO custom pipeline)  │
│           ↑                                                 │
│           │  Optional: Add global custom pipeline:          │
│           │  ──► slo-rollup-global@custom                   │
│                                                             │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Rollup Index   │  .slo-observability.sli-v3.3-YYYY.MM
│  (SLI data)     │  Contains: good/bad event counts per time bucket
└────────┬────────┘
         │
         │ Summary Transform reads from rollup index
         ▼
┌─────────────────┐     Aggregates all rollup buckets
│  Summary        │     Calculates: SLI value, error budget, burn rates
│  Transform      │     Runs continuously (every 1m)
└────────┬────────┘
         │
         │ dest.pipeline: "slo-summary-{sloId}-{revision}"
         ▼
┌─────────────────────────────────────────────────────────────┐
│              SUMMARY INGEST PIPELINE                        │
│   slo-summary-{sloId}-{revision}                            │
│                                                             │
│   1. Set status (HEALTHY/DEGRADING/VIOLATED/NO_DATA)        │
│   2. Set all SLO metadata (name, tags, objective, etc.)     │
│   3. Calculate burn rate values                             │
│   4. ──► CALL slo-summary-{sloId}@custom (per-SLO custom)   │
│           ↑                                                 │
│           │  Optional: Add global custom pipeline:          │
│           │  ──► slo-summary-global@custom                  │
│                                                             │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Summary Index  │  .slo-observability.summary-v3.3
│                 │  Contains: current SLO status, SLI values, burn rates
│                 │  (Displayed in UI)
└─────────────────┘
```

#### Key Components

**Rollup Transform**:

- Continuously queries source data (default: every 1 minute)
- Aggregates good/bad events into time buckets
- Groups by SLO ID, timestamp, and optional groupBy fields
- Sends data through SLI ingest pipeline

**SLI Ingest Pipeline** (`slo-{sloId}-{revision}`):

- Sets document metadata (\_id, event.ingested, slo.id, etc.)
- Routes data to monthly indices (.slo-observability.sli-v3.3-YYYY.MM)
- Generates slo.instanceId for grouped SLOs
- Optionally calls custom per-SLO pipeline (`slo-{sloId}@custom`)

**Summary Transform**:

- Reads from rollup index
- Aggregates all time buckets to calculate overall metrics
- Computes SLI value, error budget consumption, and burn rates
- Runs continuously (default: every 1 minute)

**Summary Ingest Pipeline** (`slo-summary-{sloId}-{revision}`):

- Sets SLO status (HEALTHY/DEGRADING/VIOLATED/NO_DATA)
- Adds all SLO metadata (name, tags, objective, etc.)
- Calculates multi-window burn rate values
- Calls per-SLO custom pipeline (`slo-summary-{sloId}@custom`)
- Writes to summary index for UI consumption

---

## 🤔 Troubleshooting

### SLO Shows "No Data"

**Causes**:

- Source data missing or delayed
- Transform hasn't run yet
- Index pattern doesn't match data
- Filter too restrictive

**Debug**:

1. Check source indices have data: Dev Tools → `GET logs-*/_search`
2. Inspect transform: Management → Transforms
3. Check transform logs for errors
4. Use SLO Inspect feature in UI

### SLO Not Updating

**Causes**:

- Transform stopped or failing
- Sync delay too short for ingestion lag
- Elasticsearch under load

**Fix**:

1. Check transform status
2. Increase `syncDelay` setting
3. Restart transform: `POST _transform/<transform-id>/_start`
4. Use `syncField` with `event.ingested` (recommended): If your source data includes an `event.ingested` field, configure the transform to use it instead of the source timestamp field.

### Incorrect SLI Values

**Causes**:

- Good/Total queries overlap incorrectly
- Timestamp field wrong
- Missing data interpreted incorrectly

**Debug**:

1. Use "Preview" in SLO creation form
2. Check queries in Dev Tools separately
3. Verify field names: Dev Tools → `GET index/_mapping`

### High Cardinality Issues

**Symptom**: Transform slow or failing, many SLO instances

**Fix**:

- Reduce groupBy cardinality: Group by less granular field (e.g., `service.name` instead of `host.id`)
- Add filters to reduce scope: Only track production environments (`env: production`), specific regions, or critical services
- Consider separate SLOs instead of grouping: Create individual SLOs for key services/endpoints rather than one grouped SLO

---

## 📓 Glossary

| Term                 | Definition                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| **SLI**              | Service Level Indicator - The actual measurement of service performance |
| **SLO**              | Service Level Objective - The target goal for the SLI                   |
| **SLA**              | Service Level Agreement - Contractual obligation with consequences      |
| **Error Budget**     | The allowed amount of failures (1 - target)                             |
| **Burn Rate**        | How fast error budget is being consumed relative to the target          |
| **Good Events**      | Events that meet success criteria                                       |
| **Total Events**     | All events measured                                                     |
| **Timeslice**        | A time bucket that is evaluated as entirely good or bad                 |
| **Occurrences**      | Budgeting method based on event counts                                  |
| **Rolling Window**   | Time window that moves with current time                                |
| **Calendar Aligned** | Time window aligned to calendar boundaries                              |
| **Transform**        | Elasticsearch feature that aggregates source data                       |
| **Grouping**         | Splitting one SLO into multiple instances by a field                    |
