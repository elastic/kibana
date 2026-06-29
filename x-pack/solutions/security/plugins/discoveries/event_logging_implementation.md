# Event Logging Implementation for Workflow Steps

## Overview

This document describes the implementation of event logging for Attack Discovery workflow steps, enabling workflow-generated discoveries to be tracked and displayed in the Attack Discovery UI alongside discoveries generated via the public API.

## Implementation Date

January 13, 2026

## Related Issue

- **Beads Issue**: kibana-fg2.17
- **Title**: Workflow steps must emit event log events for generation tracking

## Problem Statement

When users invoke the public Attack Discovery API (`POST /api/attack_discovery/_generate`), it logs events to the Elasticsearch event log. These events are tied together by `kibana.alert.rule.execution.uuid` and queried by the `GET /api/attack_discovery/generations` endpoint to display generation status in the UI.

However, workflow-based generation steps did not emit these events, meaning:
- Workflow-generated discoveries didn't appear in the generations list UI
- No status tracking for workflow executions
- No timing/performance metrics
- Users couldn't see workflow execution history

## Solution

Implemented event logging in the `attack-discovery.generate` workflow step to emit the same event structure as the public API, and moved shared event logging utilities to `@kbn/discoveries` package to eliminate code duplication.

## Architecture Changes

### Before

```
elastic_assistant plugin
├── Event logging utilities (duplicated)
└── Public API with event logging

discoveries plugin
└── Workflow steps (no event logging)
```

### After

```
@kbn/discoveries package
└── Event logging utilities (shared)
    ├── constants.ts
    ├── get_duration_nanoseconds.ts
    └── write_attack_discovery_event.ts

elastic_assistant plugin
├── Public API (uses shared utilities)
└── Imports from @kbn/discoveries

discoveries plugin
├── Workflow steps (uses shared utilities)
└── Imports from @kbn/discoveries
```

## Implementation Details

### Phase 1: Shared Utilities Migration

**Files Created:**
- `x-pack/solutions/security/packages/kbn-discoveries/src/persistence/event_logging/constants.ts`
- `x-pack/solutions/security/packages/kbn-discoveries/src/persistence/event_logging/get_duration_nanoseconds.ts`
- `x-pack/solutions/security/packages/kbn-discoveries/src/persistence/event_logging/write_attack_discovery_event.ts`
- `x-pack/solutions/security/packages/kbn-discoveries/src/persistence/event_logging/get_duration_nanoseconds.test.ts`
- `x-pack/solutions/security/packages/kbn-discoveries/src/persistence/event_logging/write_attack_discovery_event.test.ts`
- `x-pack/solutions/security/packages/kbn-discoveries/src/persistence/event_logging/index.ts`
- `x-pack/solutions/security/packages/kbn-discoveries/src/persistence/index.ts`

**Key Design Decision:**
- Abstracted `AttackDiscoveryDataClient` dependency to `EventLogRefresher` interface to avoid circular dependencies
- This allows both plugins to use the utilities without tight coupling

### Phase 2: elastic_assistant Updates

**Files Modified:**
- `x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/post_attack_discovery_generate.ts`
- `x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/post_attack_discovery_generations_dismiss.ts`
- `x-pack/solutions/security/plugins/elastic_assistant/common/constants.ts` (added deprecation comments)

**Files Deleted:**
- `x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/get_duration_nanoseconds/index.ts`
- `x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/helpers/write_attack_discovery_event/index.ts`

### Phase 3: discoveries Event Logging

**Files Modified:**
- `x-pack/solutions/security/plugins/discoveries/kibana.jsonc` (added eventLog dependency)
- `x-pack/solutions/security/plugins/discoveries/server/types.ts` (added EventLogServiceSetup)
- `x-pack/solutions/security/plugins/discoveries/server/plugin.ts` (create eventLogger)
- `x-pack/solutions/security/plugins/discoveries/server/workflows/register_workflow_steps.ts` (pass eventLogger)
- `x-pack/solutions/security/plugins/discoveries/server/workflows/steps/generate_step.ts` (implement event logging)

**Event Logging Flow in generate_step.ts:**

1. **At Start:**
   - Get `executionUuid` from `context.contextManager.getContext().execution.id`
   - Get authenticated user from security plugin
   - Get spaceId from spaces plugin
   - Get eventLogger and eventLogIndex
   - Write `generation-started` event

2. **On Success:**
   - Calculate duration using `getDurationNanoseconds`
   - Write `generation-succeeded` event with metrics:
     - `alertsContextCount`: Number of alerts sent to LLM
     - `newAlerts`: Number of discoveries generated
     - `duration`: Time taken in nanoseconds

3. **On Failure:**
   - Calculate duration
   - Write `generation-failed` event with:
     - `reason`: Error message
     - `outcome`: 'failure'

## Event Structure

Events follow the Elasticsearch event log schema:

```typescript
{
  '@timestamp': string,
  event: {
    action: 'generation-started' | 'generation-succeeded' | 'generation-failed',
    dataset: string,  // Connector ID
    duration?: number,  // Duration in nanoseconds
    end?: string,  // ISO timestamp
    outcome?: 'success' | 'failure',
    provider: 'securitySolution.attackDiscovery',
    reason?: string,  // For failed generations
    start?: string  // ISO timestamp
  },
  kibana: {
    alert: {
      rule: {
        consumer: 'siem',
        execution: {
          metrics?: {
            alert_counts: {
              active?: number,  // Alerts sent to LLM
              new?: number  // Discoveries generated
            }
          },
          status?: string,  // Loading message
          uuid: string  // Execution UUID (ties events together)
        }
      }
    },
    space_ids: [string]
  },
  message: string,
  tags: ['securitySolution', 'attackDiscovery'],
  user: {
    name: string
  }
}
```

## Testing

### Unit Tests

Created comprehensive unit tests for shared utilities:

**get_duration_nanoseconds.test.ts:**
- ✅ Correct duration for 1.5 seconds
- ✅ Correct duration for 0 seconds
- ✅ Correct duration for 1 millisecond
- ✅ Correct duration for 1 minute

**write_attack_discovery_event.test.ts:**
- ✅ Logs event with all required fields
- ✅ Includes correct event structure
- ✅ Includes metrics when alertsContextCount is provided
- ✅ Includes metrics when newAlerts is provided
- ✅ Includes both active and new counts in metrics
- ✅ Trims reason field if longer than 1024 characters
- ✅ Does not trim reason field if 1024 characters or less
- ✅ Calls dataClient refreshEventLogIndex
- ✅ Handles null dataClient gracefully
- ✅ Includes duration when provided
- ✅ Includes start and end timestamps when provided
- ✅ Includes outcome when provided
- ✅ Includes loading message as status when provided

### Manual Verification Required

The following verification steps require manual execution:

1. **Start Kibana and Elasticsearch**
   ```bash
   yarn es snapshot --E xpack.security.enabled=true
   yarn start --no-base-path
   ```

2. **Delete existing event log entries (clean slate)**
   ```bash
   curl -u elastic:changeme -X POST "http://localhost:9200/.kibana-event-log-*/_delete_by_query" -H 'Content-Type: application/json' -d'
   {
     "query": {
       "term": {
         "event.provider": "securitySolution.attackDiscovery"
       }
     }
   }
   '
   ```

3. **Execute workflow manually**
   - Navigate to Workflows UI
   - Open an Attack discovery workflow (e.g., Attack discovery - Generation)
   - Click "Run"
   - Wait for completion

4. **Query event log**
   ```bash
   curl -u elastic:changeme "http://localhost:9200/.kibana-event-log-*/_search?pretty" -H 'Content-Type: application/json' -d'
   {
     "query": {
       "term": {
         "event.provider": "securitySolution.attackDiscovery"
       }
     },
     "sort": [{"@timestamp": "asc"}]
   }
   '
   ```

5. **Test GET /generations endpoint**
   ```bash
   curl -u elastic:changeme "http://localhost:5601/api/attack_discovery/generations?page=1&perPage=10" -H 'kbn-xsrf: true'
   ```

6. **Test UI**
   - Navigate to Attack Discovery UI
   - Verify workflow-generated discoveries appear

## Benefits

1. **Unified Tracking**: Workflow and API generations tracked consistently
2. **Code Reuse**: Eliminated ~200 lines of duplicated code
3. **UI Integration**: Workflow executions visible in Attack Discovery UI
4. **Metrics**: Performance and success metrics for workflow executions
5. **Debugging**: Event log provides audit trail for troubleshooting

## Breaking Changes

None. This is an additive change that doesn't affect existing functionality.

## Deprecations

Added deprecation comments to event logging constants in `elastic_assistant/common/constants.ts` pointing to `@kbn/discoveries`. These can be removed in a future cleanup PR.

## Future Enhancements

1. **Validation Events**: Consider adding separate event logging for the validation step
2. **Additional Metrics**: Track more detailed LLM invocation metrics
3. **Event Retention**: Configure event log retention policies
4. **Alerting**: Set up alerts for failed generations

## References

- **Kibana API Docs**: https://www.elastic.co/docs/api/doc/kibana/operation/operation-getattackdiscoverygenerations
- **Event Log Plugin**: `x-pack/platform/plugins/event_log`
- **Public API Implementation**: `x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/post_attack_discovery_generate.ts`
