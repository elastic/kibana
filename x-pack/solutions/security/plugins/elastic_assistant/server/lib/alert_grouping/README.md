# Alert Grouping

The Alert Grouping feature provides intelligent grouping of security alerts into cases based on shared entities (observables) and automated Attack Discovery generation.

## Overview

Alert Grouping enables security teams to:

1. **Automatically group related alerts** into cases based on shared entities (IPs, hostnames, users, file hashes, etc.)
2. **Run Attack Discovery on case alerts** to generate AI-powered attack narratives
3. **Incrementally update Attack Discoveries** when new alerts are added to cases
4. **Auto-extract observables** from alerts for case enrichment

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Alert Grouping Workflow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐      │
│  │   Fetch      │ -> │   Extract    │ -> │   Match to           │      │
│  │   Alerts     │    │   Entities   │    │   Existing Cases     │      │
│  └──────────────┘    └──────────────┘    └──────────────────────┘      │
│                                                   │                      │
│                                                   v                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐      │
│  │   Tag        │ <- │   Validate   │ <- │   Create/Attach      │      │
│  │   Alerts     │    │   Alert      │    │   to Cases           │      │
│  │              │    │   Relevance  │    │                      │      │
│  └──────────────┘    └──────────────┘    └──────────────────────┘      │
│         ^                   ^                      │                      │
│         │                   │                      v                      │
│         │            ┌──────────────┐    ┌──────────────────────┐      │
│         │            │   Remove     │    │   Generate Attack    │      │
│         │            │   Unrelated  │ <- │   Discovery          │      │
│         │            │   Alerts     │    │                      │      │
│         │            └──────────────┘    └──────────────────────┘      │
│         │                   │                                            │
│         │                   v                                            │
│         └─── (remaining alerts) ── (unrelated alerts re-queued) ────────┘
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Alert Relevance Validation

When entity-based grouping groups alerts together, some alerts may not actually be part of the same attack chain - they just happen to share common infrastructure (e.g., the same host or IP). The Alert Relevance Validation feature uses Attack Discovery as a validation mechanism:

### How It Works

1. **After Attack Discovery Generation**: Once Attack Discovery analyzes the alerts attached to a case, it identifies which alerts are actually part of the discovered attack pattern.

2. **Validation Check**: The workflow compares the alerts attached to the case with the alerts referenced in the Attack Discovery.

3. **Remove Unrelated Alerts**: Alerts that weren't part of the discovered attack are:
   - Detached from the case
   - Have their `llm-triaged` tag removed

4. **Re-queue for Processing**: The removed alerts can be processed again in the next workflow run, potentially finding a better case match or creating a new case.

### Configuration

Enable validation in the workflow's `attackDiscoveryConfig`:

```typescript
{
  attackDiscoveryConfig: {
    enabled: true,
    validateAlertRelevance: true, // Enable validation
    // ... other AD config
  }
}
```

### API Response

When validation is enabled, the API response includes a `removed_alerts` array:

```json
{
  "metrics": {
    "alertsRemovedFromCases": 3,
    // ... other metrics
  },
  "removed_alerts": [
    {
      "alert_id": "abc123",
      "case_id": "case-456",
      "reason": "Alert was not part of the discovered attack pattern. Entities: hostname:server-1, ipv4:10.0.0.1"
    }
  ]
}
```

### Benefits

- **Higher Quality Cases**: Cases contain only truly related alerts
- **Self-Correcting**: Incorrectly grouped alerts get another chance to find the right case
- **Debugging**: Clear explanations of why alerts were removed
- **Iterative Refinement**: Over multiple runs, grouping accuracy improves

## Time-Based Grouping

Alerts can be constrained to group together only if they occur within a specific time window. This prevents unrelated alerts on the same host from being grouped together just because they share common infrastructure.

### Configuration

Set `timeProximityWindow` in the workflow's `groupingConfig`:

```typescript
{
  groupingConfig: {
    strategy: 'weighted',
    timeProximityWindow: '4h', // Alerts must be within 4 hours of each other
    // ... other config
  }
}
```

Supported time formats:
- `30m` - 30 minutes
- `4h` - 4 hours  
- `1d` - 1 day

### How It Works

1. **Entity Matching with Time Check**: When an alert is being matched to a case, the system checks if the alert's timestamp falls within the time window of the case's existing alerts.

2. **Window Extension**: The time window extends from the earliest to the latest alert in the case, plus the configured buffer on each end.

3. **Separate Cases**: Alerts on the same host but outside the time window will create separate cases.

### Example

With `timeProximityWindow: '4h'`:
- Alert 1 on `host-1` at 9:00 AM → Creates Case A
- Alert 2 on `host-1` at 10:00 AM → Matches Case A (within 4h)
- Alert 3 on `host-1` at 9:00 PM → Creates Case B (outside 4h window)

## Case Merging After Attack Discovery

When time-based grouping creates separate cases that turn out to be part of the same attack, the system can automatically merge them after Attack Discovery analysis.

### How It Works

1. **Attack Discovery Analysis**: After generating Attack Discoveries for multiple cases, the system compares them.

2. **Similarity Detection**: Using LLM analysis, the system determines if two Attack Discoveries describe the same attack pattern.

3. **Automatic Merge**: Cases with high similarity are merged:
   - All alerts are moved to the target case
   - Observables are copied
   - A detailed note is added explaining the merge
   - The source case is closed with a reference to the merged case

### Configuration

Enable case merging in the workflow's `attackDiscoveryConfig`:

```typescript
{
  attackDiscoveryConfig: {
    enabled: true,
    enableCaseMerging: true,
    caseMergeSimilarityThreshold: 0.7, // 70% similarity threshold
    // ... other config
  }
}
```

### API Response

When cases are merged, the API response includes a `merged_cases` array:

```json
{
  "metrics": {
    "casesMerged": 1,
    // ... other metrics
  },
  "merged_cases": [
    {
      "source_case_id": "case-123",
      "source_case_title": "Alert Group: hostname: server-1 (Feb 5 PM)",
      "target_case_id": "case-456",
      "target_case_title": "Alert Group: hostname: server-1 (Feb 5 AM)",
      "reason": "Both cases describe the same lateral movement attack from compromised host server-1"
    }
  ]
}
```

### Merge Note Example

When cases are merged, the following note is added to the target case:

> **Case Merged**: This case was merged with "Alert Group: hostname: server-1 (Feb 5 PM)" because Attack Discovery analysis determined they are part of the same attack.
>
> **Similarity Score**: 85.0%
>
> **Reason**: Both cases describe the same lateral movement attack originating from compromised host server-1, using identical TTPs and targeting the same systems.

### Benefits

- **Complete Attack Timeline**: Cases that were split due to time constraints can be reunited
- **Reduced Alert Fatigue**: Analysts see one comprehensive case instead of multiple related cases
- **Full Context**: Attack Discoveries provide clear reasoning for why cases were merged
- **Audit Trail**: The merge reason and original case references are preserved

## Core Components

### 1. Entity Extraction Service

Extracts observable entities from alert documents:

- **IPv4/IPv6 addresses** from `source.ip`, `destination.ip`, etc.
- **Hostnames** from `host.name`, `agent.hostname`, etc.
- **Users** from `user.name`, `user.id`, etc.
- **File hashes** (SHA256, MD5, SHA1) from `file.hash.*`, `process.hash.*`
- **Domains** from `dns.question.name`, `url.domain`, etc.
- **URLs** from `url.full`, `url.original`
- **Email addresses** from `user.email`, `source.user.email`

```typescript
import { EntityExtractionService } from './services';

const service = new EntityExtractionService({ logger, entityTypeConfigs });
const { entities, entitiesByType } = service.extractEntities(alerts);
```

### 2. Case Matching Service

Matches extracted entities against existing case observables:

- **Strict strategy**: Requires high percentage of entities to match
- **Relaxed strategy**: Matches with any shared entity
- **Weighted strategy**: Uses entity type weights for scoring
- **Temporal strategy**: Considers time proximity

```typescript
import { CaseMatchingService } from './services';

const service = CaseMatchingService.withConfig({ strategy: 'weighted' });
const matches = service.findMatchingCases(entities, existingCases);
const bestMatch = service.selectBestMatch(matches);
```

### 3. Workflow Executor

Orchestrates the entire alert grouping process:

```typescript
import { AlertGroupingWorkflowExecutor } from './workflows/default_alert_grouping_workflow';

const executor = new AlertGroupingWorkflowExecutor({
  config,
  dependencies,
  isDryRun: false,
});

const { metrics, errors } = await executor.execute();
```

### 4. Workflow Data Client

Persists workflow configurations and execution history:

```typescript
import { WorkflowDataClient } from './persistence';

const client = new WorkflowDataClient({ soClient, spaceId, currentUser });

// Create workflow
const workflow = await client.createWorkflow({
  name: 'Daily Alert Grouping',
  enabled: true,
  schedule: { interval: '1h' },
  alertFilter: { status: 'open' },
  groupingConfig: { strategy: 'weighted' },
});

// Get execution history
const { results } = await client.findExecutions(workflow.id, { page: 1, perPage: 10 });
```

## Attack Discovery Integration

### How It Works

The Alert Grouping workflow integrates with Attack Discovery to:

1. **Generate Attack Discoveries per Case**: After alerts are attached to a case, Attack Discovery analyzes them to generate AI-powered attack narratives.

2. **Validate Alert Relevance**: Attack Discovery identifies which alerts are actually part of the discovered attack pattern. Alerts not referenced in the discovery are considered unrelated and are:
   - Detached from the case
   - Have their `llm-triaged` tag removed to be re-processed in the next run

3. **Merge Related Cases**: Cases with Attack Discoveries that describe the same attack can be automatically merged.

### Configuration

To enable Attack Discovery integration, configure the workflow with:

```typescript
{
  // API configuration for the LLM connector
  apiConfig: {
    connectorId: 'your-connector-id',     // Required: The connector ID for your LLM
    actionTypeId: '.gen-ai',               // Action type (e.g., '.gen-ai', '.bedrock')
    model: 'gpt-4',                        // Optional: Model identifier
  },
  
  // Attack Discovery configuration
  attackDiscoveryConfig: {
    enabled: true,                         // Enable Attack Discovery generation
    validateAlertRelevance: true,          // Enable alert validation using AD results
    enableCaseMerging: true,               // Enable case merging based on AD similarity
    caseMergeSimilarityThreshold: 0.7,     // Similarity threshold for merging (0-1)
  },
}
```

### API Request Example

```bash
POST /api/security/alert_grouping/workflow/{workflow_id}/_run
{
  "dry_run": false,
  "time_range": {
    "start": "now-7d",
    "end": "now"
  },
  "include_statuses": ["open"]
}
```

### Per-Case Attack Discovery Generation

You can also trigger Attack Discovery generation for a specific case and have the results attached directly to that case's Attack Discoveries tab.

**Endpoint**: `POST /api/security/alert_grouping/cases/{case_id}/_generate_attack_discovery`

**Request Body**:

```json
{
  "connectorId": "your-connector-id",      // Optional: LLM connector ID (uses default if not specified)
  "actionTypeId": ".bedrock",              // Optional: Action type
  "alertsIndexPattern": ".alerts-security.alerts-*",  // Optional: Alerts index pattern
  "attachToCase": true,                    // Optional: Attach discoveries to case (default: true)
  "updateCaseDetails": true                // Optional: Update case title/description from AD (default: true)
}
```

**Example**:

```bash
curl -X POST "http://localhost:5601/api/security/alert_grouping/cases/{case_id}/_generate_attack_discovery" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <base64_credentials>" \
  -d '{
    "connectorId": "pmeClaudeV3SonnetUsEast1",
    "attachToCase": true,
    "updateCaseDetails": true
  }'
```

**Response**:

```json
{
  "case_id": "7ff7e287-c35a-4e57-bc2a-24e50bcecf94",
  "execution_status": "completed",
  "attack_discoveries": [
    {
      "id": "ad-123",
      "title": "Phishing to Persistent Malware Attack Chain",
      "summary": "Attack summary...",
      "details": "Detailed analysis...",
      "mitre_tactics": ["Initial Access", "Execution", "Persistence"],
      "risk_score": 85,
      "alert_ids": ["alert-1", "alert-2", "alert-3"],
      "entity_summary": "Malware infection on host-xyz for user-abc"
    }
  ],
  "alerts_analyzed": 20,
  "alerts_in_discoveries": 12,
  "attached_to_case": 2,
  "case_updated": true
}
```

**Case Details Auto-Update**:

When `updateCaseDetails` is `true` (default), the endpoint will automatically update the case:
- **Title**: If the current case title is generic (e.g., "New Case", "Alert Grouping Case", etc.), it will be replaced with the primary Attack Discovery's title
- **Description**: If the case description is empty, it will be set to the primary Attack Discovery's summary

This ensures cases created through alert grouping workflows have meaningful, LLM-generated titles and descriptions based on the actual attack patterns detected.

This endpoint:
1. Retrieves all alerts attached to the specified case
2. Generates Attack Discoveries using the configured LLM connector
3. Creates Attack Discovery alert documents in Elasticsearch
4. Attaches them to the case as external reference attachments (visible in the Attack Discoveries tab)

### API Response

The API response includes detailed information about Attack Discovery processing:

```json
{
  "execution_id": "uuid",
  "status": "completed",
  "metrics": {
    "alertsProcessed": 50,
    "casesCreated": 3,
    "attackDiscoveriesGenerated": 3,
    "alertsRemovedFromCases": 5,
    "casesMerged": 1
  },
  "grouping_decisions": [
    {
      "alert_id": "alert-123",
      "case_id": "case-456",
      "case_title": "Lateral Movement Attack",
      "explanation": "Matched existing case by shared observables",
      "matched_observables": [
        { "type": "ipv4", "value": "10.0.0.1", "matched_entity_value": "10.0.0.1" }
      ]
    }
  ],
  "removed_alerts": [
    {
      "alert_id": "alert-789",
      "case_id": "case-456",
      "reason": "Alert was not part of the discovered attack pattern"
    }
  ],
  "merged_cases": [
    {
      "source_case_id": "case-111",
      "target_case_id": "case-456",
      "reason": "Same lateral movement attack detected with 85% similarity"
    }
  ]
}
```

## Attack Discovery Enhancements

### Batched Processing

Processes large numbers of alerts by splitting into batches:

```typescript
import { BatchProcessor } from '../attack_discovery/batch_processing';

const processor = new BatchProcessor({
  logger,
  config: {
    batchSize: 100,
    maxAlerts: 10000,
    parallelBatches: 3,
    mergeStrategy: 'hierarchical',
  },
});

const result = await processor.process(alerts, processBatch, mergeResults);
```

### Incremental Processing

Updates existing Attack Discoveries with new alerts:

```typescript
import { IncrementalProcessor } from '../attack_discovery/incremental_processing';

const processor = new IncrementalProcessor({
  logger,
  mergeService,
  generateDiscovery,
});

const result = await processor.process({
  existingDiscovery,
  newAlerts,
  allAlertIds,
  mode: 'delta', // or 'enhance' or 'full'
});
```

### Merge Service

Intelligently merges Attack Discoveries:

```typescript
import { AttackDiscoveryMergeService } from '../attack_discovery/batch_processing';

const mergeService = new AttackDiscoveryMergeService({ logger, llm });

// Identify overlaps
const overlaps = mergeService.identifyOverlaps(discoveries1, discoveries2);

// Merge discoveries
const merged = await mergeService.merge(discoveries1, discoveries2);
```

## Cases Integration

### Observable Auto-Extraction

Automatically extracts observables when alerts are attached to cases:

```typescript
import { ObservableAutoExtractor } from './cases';

const extractor = new ObservableAutoExtractor({
  logger,
  config: {
    enabled: true,
    entityTypes: ['ipv4', 'hostname', 'user'],
    maxObservablesPerType: 50,
    deduplicateExisting: true,
  },
});

const { observables, totalExtracted } = extractor.extractObservablesFromAlerts(
  alerts,
  existingObservables
);
```

### Case Event Triggers

Trigger actions when case events occur:

```typescript
import { CaseEventTriggerService, CaseEventType, TriggerAction } from './cases';

const triggerService = CaseEventTriggerService.create({
  logger,
  soClient,
  spaceId,
  currentUser,
});

// Create a trigger
await triggerService.createTrigger({
  caseId: 'case-123',
  triggerType: 'alert_attached',
  action: TriggerAction.INCREMENTAL_ATTACK_DISCOVERY,
  enabled: true,
  debounceSeconds: 30,
});

// Handle events
await triggerService.handleEvent(event, async (actionRequest) => {
  // Execute the triggered action
});
```

## API Endpoints

### Workflow Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/security/alert_grouping/workflows` | Create workflow |
| GET | `/api/security/alert_grouping/workflows/{id}` | Get workflow |
| PATCH | `/api/security/alert_grouping/workflows/{id}` | Update workflow |
| DELETE | `/api/security/alert_grouping/workflows/{id}` | Delete workflow |
| POST | `/api/security/alert_grouping/workflows/{id}/_enable` | Enable workflow |
| POST | `/api/security/alert_grouping/workflows/{id}/_disable` | Disable workflow |
| POST | `/api/security/alert_grouping/workflows/{id}/_run` | Manual trigger |
| GET | `/api/security/alert_grouping/workflows/{id}/executions` | Execution history |

### Entity Extraction

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/security/alert_grouping/alerts/_extract_entities` | Extract entities from alerts |

### Cases Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/security/alert_grouping/cases/{case_id}/_extract_observables` | Extract observables |
| POST | `/api/security/alert_grouping/cases/{case_id}/triggers` | Create trigger |
| GET | `/api/security/alert_grouping/cases/{case_id}/triggers` | List triggers |
| DELETE | `/api/security/alert_grouping/cases/{case_id}/triggers/{trigger_id}` | Delete trigger |
| POST | `/api/security/alert_grouping/cases/{case_id}/_notify` | Notify of case event |

### Attack Discovery (Internal)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attack_discovery/_generate_batched` | Batched generation |
| POST | `/api/attack_discovery/_generate_incremental` | Incremental generation |

## Scheduled Execution

The Alert Grouping feature supports automated scheduled execution via Kibana's Task Manager.

### How It Works

1. **Task Registration**: When the Elastic Assistant plugin starts, it registers an alert grouping task type with Task Manager.

2. **Workflow Scheduling**: When a workflow is created or updated with a schedule and is enabled, a Task Manager task instance is created to run the workflow at the specified interval.

3. **Task Execution**: When the task runs:
   - It fetches the workflow configuration
   - Validates the workflow is still enabled
   - Executes the alert grouping workflow
   - Updates the execution history with results
   - Reschedules for the next interval

4. **Automatic Unscheduling**: When a workflow is disabled or deleted, the scheduled task is automatically removed.

### Schedule Configuration

Configure a schedule when creating or updating a workflow:

```bash
POST /api/security/alert_grouping/workflow
{
  "name": "Automated Alert Grouping",
  "enabled": true,
  "schedule": {
    "interval": "15m",           // Run every 15 minutes
    "timezone": "UTC",           // Optional: timezone for the schedule
    "runOnWeekends": true        // Optional: whether to run on weekends
  },
  "alertFilter": {
    "status": "open",
    "excludeTags": ["llm-triaged"],
    "timeRange": {
      "start": "now-1h",
      "end": "now"
    }
  },
  "groupingConfig": {
    "strategy": "weighted",
    "entityTypes": [
      { "type": "ipv4", "weight": 1.0 },
      { "type": "hostname", "weight": 1.5 },
      { "type": "user", "weight": 1.2 }
    ]
  }
}
```

### Supported Intervals

The interval follows the standard Kibana interval format:
- `5m` - 5 minutes
- `15m` - 15 minutes
- `1h` - 1 hour
- `6h` - 6 hours
- `1d` - 1 day

### Monitoring Scheduled Executions

Track scheduled execution via the executions API:

```bash
GET /api/security/alert_grouping/workflow/{workflow_id}/executions
{
  "results": [
    {
      "id": "execution-uuid",
      "workflowId": "workflow-uuid",
      "triggeredBy": "schedule",
      "startedAt": "2024-02-05T10:00:00Z",
      "completedAt": "2024-02-05T10:02:30Z",
      "status": "completed",
      "metrics": {
        "alertsProcessed": 150,
        "casesCreated": 5,
        "alertsAttached": 145,
        "attackDiscoveriesGenerated": 5,
        "durationMs": 150000
      }
    }
  ],
  "total": 48,
  "page": 1
}
```

### Enabling/Disabling Scheduled Workflows

Enable or disable a workflow's schedule:

```bash
# Disable scheduling
POST /api/security/alert_grouping/workflow/{workflow_id}/_disable

# Enable scheduling
POST /api/security/alert_grouping/workflow/{workflow_id}/_enable
```

When disabled, the scheduled task is removed but the workflow configuration is preserved. When re-enabled, a new task is scheduled.

### Manual Trigger

You can also manually trigger a scheduled workflow:

```bash
POST /api/security/alert_grouping/workflow/{workflow_id}/_run
{
  "dry_run": false
}
```

This runs the workflow immediately without waiting for the next scheduled execution.

## Configuration

### Workflow Configuration

```typescript
interface AlertGroupingWorkflowConfig {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule: WorkflowSchedule;
  alertFilter: AlertFilter;
  groupingConfig: GroupingConfig;
  caseTemplate?: CaseTemplate;
  attackDiscoveryConfig?: AttackDiscoveryConfig;
  spaceId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}
```

### Grouping Strategies

| Strategy | Description |
|----------|-------------|
| `strict` | Requires high entity match percentage (default: 80%) |
| `relaxed` | Any shared entity triggers grouping |
| `weighted` | Uses entity type weights for scoring |
| `temporal` | Also considers time proximity |

### Entity Types

| Type | Description | Example Fields |
|------|-------------|----------------|
| `ipv4` | IPv4 addresses | `source.ip`, `destination.ip` |
| `hostname` | Hostnames | `host.name`, `agent.hostname` |
| `user` | Usernames | `user.name`, `user.id` |
| `domain` | Domain names | `dns.question.name`, `url.domain` |
| `file_hash_sha256` | SHA256 hashes | `file.hash.sha256` |
| `file_hash_md5` | MD5 hashes | `file.hash.md5` |
| `url` | Full URLs | `url.full`, `url.original` |
| `email` | Email addresses | `user.email` |

## Testing

Run unit tests:

```bash
yarn test:jest x-pack/solutions/security/plugins/elastic_assistant/server/lib/alert_grouping
```

Run integration tests:

```bash
yarn test:jest_integration x-pack/solutions/security/plugins/elastic_assistant/server/lib/alert_grouping
```

## Future Enhancements

1. **ML-based grouping**: Use machine learning for more intelligent alert correlation
2. **Graph-based analysis**: Build entity relationship graphs for better context
3. **Custom entity extractors**: Plugin architecture for custom entity types
4. **Workflow templates**: Pre-configured workflows for common use cases
5. **Real-time streaming**: Process alerts in real-time as they arrive
