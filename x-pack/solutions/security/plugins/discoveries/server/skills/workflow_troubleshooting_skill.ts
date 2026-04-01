/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

import {
  GET_EXECUTION_SUMMARY_TOOL_ID,
  getExecutionSummaryTool,
} from './tools/get_execution_summary_tool';
import {
  GET_WORKFLOW_HEALTH_CHECK_TOOL_ID,
  getWorkflowHealthCheckTool,
} from './tools/get_workflow_health_check_tool';
import type { WorkflowFetcher } from './tools/get_workflow_health_check_tool';

const VALIDATE_WORKFLOW_TOOL_ID = 'platform.workflows.validate_workflow';
const GET_STEP_DEFINITIONS_TOOL_ID = 'platform.workflows.get_step_definitions';

/**
 * Creates the workflow troubleshooting skill for diagnosing Attack Discovery
 * workflow execution failures. The skill guides the agent through a structured
 * analysis of the 3-phase pipeline (alert retrieval, generation, validation)
 * to identify which phase failed and why.
 */
export const createWorkflowTroubleshootingSkill = (fetcher: WorkflowFetcher) =>
  defineSkillType({
    basePath: 'skills/security/attack-discovery',
    content: `# Attack Discovery Workflow Troubleshooting

## Purpose

Diagnose failures in Attack Discovery workflow executions. Attack Discovery uses a
3-phase pipeline architecture where each phase runs as a separate workflow execution:

1. **Alert Retrieval** (alert retrieval) — Fetches security alerts from Elasticsearch (one or more parallel workflows)
2. **Generation** (generation) — Sends anonymized alerts to an LLM to produce attack discoveries
3. **Validation** (validation) — Filters hallucinated alert IDs, deduplicates discoveries, and persists results

Each phase can fail independently. Your job is to determine which phase(s) failed,
examine the step-level details and workflow YAML, and provide a clear diagnosis.

## Troubleshooting Approach

A diagnostic report attachment may be present. Use it for your initial analysis — it contains pre-computed execution timeline, error classification, and environment info. Only call tools if you need to verify current state, dig deeper into step-level details, or check workflow health.

### Step 1: Fetch Execution Details

Call the \`${GET_EXECUTION_SUMMARY_TOOL_ID}\` tool with the execution IDs from the
user's attachment. This returns per-phase execution status, per-step status with
errors and timing, and the workflow YAML for each phase.

### Step 2: Check Workflow Health (when phases are empty or execution not found)

If the attachment shows empty phases or the failure_reason mentions a workflow ID,
call the \`${GET_WORKFLOW_HEALTH_CHECK_TOOL_ID}\` tool with the workflow IDs from
\`configured_workflow_ids\`. This reveals if workflows are disabled, deleted, or
invalid — conditions that prevent execution from starting at all.

### Step 3: Identify the Failing Phase

Examine the status of each phase:
- ✅ **succeeded** — This phase completed without errors
- ❌ **failed** — This phase encountered an error (examine step-level details)
- ❌ **timed_out** — This phase exceeded its timeout (check step timeouts and workflow timeout)
- ❌ **not_found** — The execution record was not found (may have been cleaned up or never started)

### Step 4: Analyze Step-Level Failures

For each failed phase, examine the individual step executions:
- Look at the \`error\` field for the specific error message
- Check \`executionTimeMs\` to identify slow steps
- Review the \`stepType\` to understand what the step was attempting
- Use \`topologicalIndex\` to understand execution order

### Step 5: Validate the Workflow YAML

If the failure appears related to workflow configuration, call the
\`${VALIDATE_WORKFLOW_TOOL_ID}\` tool with the workflow YAML from the execution
summary to check for syntax errors, invalid step types, or misconfigured parameters.

### Step 6: Look Up Step Type Definitions

If you need to understand a step type's expected parameters or behavior, call the
\`${GET_STEP_DEFINITIONS_TOOL_ID}\` tool to retrieve the step type schema and examples.

### Step 7: Check Execution Status (if still running)

If a phase shows as still running, use the \`${platformCoreTools.getWorkflowExecutionStatus}\`
tool to check its current status.

## Response Format

Summarize your findings using this structure:

### Pipeline Status
- ✅ Alert Retrieval: [status summary]
- ✅ Generation: [status summary]
- ❌ Validation: [status summary with error]

### Error Category
[If available from the diagnostic report attachment or determinable from the error details, include the structured error category: \`rate_limit\`, \`network_error\`, \`permission_error\`, \`cluster_health\`, \`concurrent_conflict\`, \`anonymization_error\`, \`step_registration_error\`, \`connector_error\`, \`timeout\`, or \`unknown\`]

### Root Cause
[Clear explanation of what went wrong and why]

### Suggested Fix
[Actionable recommendation for resolving the issue. Include specific Kibana deep links where applicable:]
- For workflow issues: \`/app/workflows/{workflowId}\` (construct from health check data or \`configured_workflow_ids\` in the attachment)
- For connector issues: \`/app/management/insightsAndAlerting/triggersActionsConnectors/connectors\`

## Available Tools

- \`${GET_EXECUTION_SUMMARY_TOOL_ID}\` — Fetch execution details for all pipeline phases
- \`${GET_WORKFLOW_HEALTH_CHECK_TOOL_ID}\` — Inspect current state of configured workflows (enabled/valid/found)
- \`${VALIDATE_WORKFLOW_TOOL_ID}\` — Validate workflow YAML against all rules
- \`${GET_STEP_DEFINITIONS_TOOL_ID}\` — Look up step type definitions and parameters
- \`${platformCoreTools.getWorkflowExecutionStatus}\` — Check current status of a running execution

## Constraints

- **Read-only**: Do not modify any workflows or Elasticsearch data
- **No ES|QL execution**: Do not execute ES|QL queries directly; only analyze the workflow configuration
- **Security-sensitive**: Execution data may contain error messages with system details; summarize without exposing raw internals unless the user requests them

## Anti-Patterns — Avoid These Common Mistakes

### Do NOT suggest RBAC/permission fixes unless there is direct evidence

Only suggest RBAC or privilege remediation when:
- The error category is explicitly \`permission_error\`, AND
- The actual error message contains one of the known permission patterns: "403", "forbidden", "unauthorized", "401", "insufficient privileges", or "security_exception"

**Do NOT infer permission issues from indirect signals such as:**
- A \`timeout\` status — generation timeouts are caused by LLM latency or too many alerts, never by missing RBAC privileges
- Zero discoveries produced — this is a normal outcome when the model finds nothing or when the generation step timed out
- No explicit error message in the step details — absence of an error is not evidence of a permission problem`,
    description:
      'Troubleshoot Attack Discovery workflow execution failures by analyzing the 3-phase pipeline (alert retrieval, generation, validation), identifying failing phases and steps, and providing root cause analysis with suggested fixes.',
    getInlineTools: () => [getExecutionSummaryTool(fetcher), getWorkflowHealthCheckTool(fetcher)],
    getRegistryTools: () => [
      platformCoreTools.getWorkflowExecutionStatus,
      VALIDATE_WORKFLOW_TOOL_ID,
      GET_STEP_DEFINITIONS_TOOL_ID,
    ],
    id: 'attack-discovery-workflow-troubleshooting',
    name: 'attack-discovery-workflow-troubleshooting',
    referencedContent: [
      {
        content: `# Attack Discovery Custom Step Types

## Overview

Attack Discovery workflows use custom step types registered by the discoveries plugin.
These step types are specific to the Attack Discovery domain and are not available in
general-purpose workflows.

## Step Types

### attack-discovery.defaultAlertRetrieval

Retrieves security alerts from Elasticsearch for Attack Discovery analysis.

**Inputs:**
- \`alerts_index_pattern\` — Elasticsearch index pattern (defaults to \`.alerts-security.alerts-<spaceId>\`)
- \`anonymization_fields\` — Fields to anonymize before LLM processing
- \`api_config\` — LLM connector configuration (\`action_type_id\`, \`connector_id\`, \`model\`)
- \`end\` — Time range end (e.g., \`"now"\`)
- \`esql_query\` — Optional ES|QL query (overrides DSL-based retrieval)
- \`filter\` — Elasticsearch query filter
- \`replacements\` — Existing anonymization replacements
- \`size\` — Maximum number of alerts to retrieve (default: 150)
- \`start\` — Time range start (e.g., \`"now-24h"\`)

**Common Failure Modes:**
- Elasticsearch connection errors or index not found
- Invalid anonymization field configuration
- ES|QL query syntax errors (when using esql_query mode)
- Timeout when retrieving large numbers of alerts

### attack-discovery.generate

Sends anonymized alerts to an LLM to generate attack discoveries.

**Inputs:**
- \`alerts\` — Array of anonymized alert strings
- \`api_config\` — LLM connector configuration
- \`replacements\` — Anonymization replacement map
- \`type\` — Discovery type (always \`"attack_discovery"\`)

**Common Failure Modes:**
- LLM connector timeout or rate limiting
- Invalid connector configuration (wrong connector ID or model)
- LLM response parsing failure (malformed JSON from model)
- Empty alerts array (no alerts to analyze)

### attack-discovery.defaultValidation

Validates generated attack discoveries by filtering hallucinated alert IDs
and deduplicating results.

**Inputs:**
- \`alerts_context_count\` — Number of alerts analyzed
- \`alerts_index_pattern\` — Index pattern for alert ID validation
- \`anonymized_alerts\` — Anonymized alerts in Document format
- \`api_config\` — LLM connector configuration
- \`attack_discoveries\` — Generated discoveries to validate
- \`connector_name\` — Human-readable connector name
- \`generation_uuid\` — UUID linking to the generation execution
- \`replacements\` — Anonymization replacements

**Common Failure Modes:**
- Elasticsearch query failure when validating alert IDs
- All discoveries filtered as hallucinated (zero valid discoveries)
- Missing required inputs from generation phase

### attack-discovery.persistDiscoveries

Persists validated discoveries to the Elasticsearch index.

**Inputs:**
- \`alerts_context_count\` — Number of alerts analyzed
- \`anonymized_alerts\` — Anonymized alerts
- \`api_config\` — LLM connector configuration
- \`attack_discoveries\` — Validated discoveries to persist
- \`connector_name\` — Connector name for metadata
- \`enable_field_rendering\` — Enable field rendering in UI (default: true)
- \`generation_uuid\` — Generation execution UUID
- \`replacements\` — Anonymization replacements
- \`with_replacements\` — Include replacements in persisted data (default: false)

**Common Failure Modes:**
- Elasticsearch write failure (disk space, permissions)
- Invalid discovery format from validation phase`,
        name: 'attack-discovery-step-types',
        relativePath: './references',
      },
      {
        content: `# Workflow YAML Concepts for Attack Discovery

## Liquid Templating

Workflow YAML uses Liquid templates for dynamic values. In Attack Discovery workflows,
you will commonly see:

### Input References
- \`\${{ inputs.api_config }}\` — Reference a workflow input
- \`\${{ inputs.additional_alerts }}\` — Reference the alerts array input
- \`\${{ inputs.replacements }}\` — Reference anonymization replacements

### Step Output References
- \`\${{ steps.generate_discoveries.output.attack_discoveries }}\` — Reference a previous step's output
- \`\${{ steps.retrieve_alerts.output }}\` — Reference the full output of a step

### Built-in Variables
- \`\${{ workflow.spaceId }}\` — The current Kibana space ID
- \`\${{ foreach.item }}\` — Current item in a foreach loop

### Liquid Filters
- \`| size\` — Get array length: \`\${{ inputs.alerts | size }}\`
- \`| json\` — Convert to JSON string
- \`| default: "value"\` — Provide fallback if nil

### Conditional Liquid
\`\`\`yaml
alerts_index_pattern: '{%- if inputs.alerts_index_pattern -%}{{ inputs.alerts_index_pattern }}{%- else -%}.alerts-security.alerts-{{ workflow.spaceId }}{%- endif -%}'
\`\`\`

## Timeouts

Each step can have an individual timeout:
\`\`\`yaml
steps:
  - name: generate_discoveries
    type: attack-discovery.generate
    timeout: '10m'
\`\`\`

Common timeout values in Attack Discovery:
- Alert retrieval: \`5m\` (may be large queries)
- Generation: \`10m\` (LLM calls can be slow)
- Validation: no explicit timeout (relatively fast)

When a step times out, the execution status changes to \`timed_out\` and the
error field describes which step exceeded its timeout.

## Error Propagation

When a step fails, the workflow execution stops at that step by default.
The execution status is set to \`failed\` and the error from the failing step
propagates to the workflow-level error field.

### on-failure Handling
Steps can define \`on-failure\` blocks for retry and fallback:
\`\`\`yaml
steps:
  - name: my_step
    type: some_type
    on-failure:
      retry:
        max-attempts: 3
        delay: '5s'
      fallback:
        - name: handle_error
          type: console
          with:
            message: "Step failed"
      continue: true
\`\`\`

Attack Discovery default workflows do NOT use on-failure blocks, so any step
failure causes the entire workflow to fail immediately.

## Workflow Outputs

Workflows declare outputs that are available after execution completes:
\`\`\`yaml
outputs:
  - name: attack_discoveries
    type: array
    description: Generated attack discoveries
    value: \${{ steps.generate_discoveries.output.attack_discoveries }}
\`\`\`

The pipeline orchestrator reads these outputs to pass data between phases
(e.g., alert retrieval outputs feed into generation inputs).`,
        name: 'workflow-yaml-concepts',
        relativePath: './references',
      },
      {
        content: `# Pre-Execution Failure Patterns

## Overview

When \`phases: []\` is present alongside a \`failure_reason\`, the pipeline failed
before any workflow execution started. No execution records exist to fetch, so
\`get_execution_summary\` will return \`not_found\` for all phases.

In these cases, use \`${GET_WORKFLOW_HEALTH_CHECK_TOOL_ID}\` with the workflow IDs
from \`configured_workflow_ids\` to determine the root cause.

## Failure Keywords

| Keyword in failure_reason | Meaning | Suggested Fix |
|--------------------------|---------|---------------|
| \`not enabled\` | The workflow is disabled in the Workflows UI | Enable the workflow |
| \`not found\` | The workflow was deleted or the ID is wrong | Re-create or reconfigure the workflow |
| \`not valid\` | The workflow YAML has syntax or schema errors | Fix the workflow YAML |

## Example Diagnosis Flow

1. See \`phases: []\` and \`failure_reason\` containing a workflow ID
2. Call \`${GET_WORKFLOW_HEALTH_CHECK_TOOL_ID}\` with the IDs from \`configured_workflow_ids\`
3. Inspect the returned health objects:
   - \`found: false\` → workflow was deleted
   - \`enabled: false\` → workflow is disabled
   - \`valid: false\` → workflow YAML has errors
4. Report the specific issue and recommend the appropriate fix`,
        name: 'pre-execution-failure-patterns',
        relativePath: './references',
      },
      {
        content: `# Expanded Error Categories

## Overview

Workflow execution failures can be classified into structured error categories.
When a diagnostic report attachment is present, the \`error_category\` field is
pre-computed. When diagnosing manually, use the error message patterns below to
determine the category.

## Error Categories and Remediation

### rate_limit

**Pattern:** Error messages containing "rate limit", "429", "too many requests", or "quota exceeded".

**Remediation:**
- Wait and retry the execution after a cooldown period
- Check LLM provider rate limits and usage quotas
- Consider switching to a connector with higher rate limits
- Stagger parallel alert retrieval workflows to reduce burst load

### network_error

**Pattern:** Error messages containing "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "socket hang up", "network error", or "fetch failed".

**Remediation:**
- Check network connectivity between Kibana and the LLM provider
- Verify proxy settings in \`kibana.yml\` (\`xpack.actions.proxyUrl\`)
- Check firewall rules and DNS resolution
- Review connector URL configuration for typos

### permission_error

**Pattern:** Error messages containing "403", "forbidden", "unauthorized", "insufficient privileges", "missing required privilege", or "security_exception".

⚠️ **False-positive guard:** Only apply this remediation when one of the above patterns appears in an actual error message. A \`timeout\` or zero-discoveries result does NOT indicate a permission error — do not suggest RBAC fixes for those situations.

**Remediation:**
- Check the user's RBAC roles have the required Kibana feature privileges
- Verify the Elasticsearch API key or service account has index-level permissions
- For connector errors, ensure the user has \`actions:execute\` privilege
- Review space-level feature visibility settings

### cluster_health

**Pattern:** Error messages containing "circuit_breaking_exception", "cluster_block_exception", "shard_not_available", "index_not_found", "no_shard_available", or "es_rejected_execution".

**Remediation:**
- Check Elasticsearch cluster health (\`GET _cluster/health\`)
- Verify shard allocation and disk watermarks
- Review thread pool queue sizes for rejected executions
- Ensure the alerts index exists and has active shards

### concurrent_conflict

**Pattern:** Error messages containing "version_conflict", "concurrent", "conflict", or "already running".

**Remediation:**
- Retry the execution — the conflict is often transient
- Check for parallel executions targeting the same Attack Discovery resources
- Review execution timing to avoid overlapping scheduled runs

### anonymization_error

**Pattern:** Error messages containing "anonymization", "field not found", "missing field", or occurring in the \`defaultAlertRetrieval\` step's anonymization phase.

**Remediation:**
- Check anonymization field configuration in Security > AI Assistant > Anonymization
- Verify the configured fields exist in the alerts index mapping
- Review custom anonymization rules for syntax errors
- Ensure the anonymization field list is not empty

### step_registration_error

**Pattern:** Error messages containing "step type not found", "unknown step type", "not registered", or "no handler".

**Remediation:**
- Verify the discoveries plugin is loaded and enabled
- Check that all required plugins are installed (\`xpack.securitySolution.enabled\`)
- Restart Kibana to re-register step types
- For custom steps, verify the plugin providing them is active

### connector_error

**Pattern:** Error messages containing "connector", "action execution", "preconfigured", or occurring in steps that invoke LLM connectors.

**Remediation:**
- Navigate to [Connector Management](/app/management/insightsAndAlerting/triggersActionsConnectors/connectors) to verify the connector is active
- Check connector credentials are valid and not expired
- Test the connector using the "Test" tab in connector settings
- Verify the connector's model configuration matches the provider's requirements

### timeout

**Pattern:** Execution status is \`timed_out\`, or error messages containing "timeout", "timed out", or "deadline exceeded".

⚠️ **Not a permission issue:** Timeouts are caused by LLM latency or excessive alert volume — never by missing RBAC privileges. Do NOT suggest RBAC fixes for timeouts.

**Remediation:**
- For LLM generation timeouts: reduce the number of alerts (try 20–30) or switch to a faster connector/model
- Check if the LLM provider is experiencing latency issues
- Review step-level timeouts in the workflow YAML — consider increasing the generation step timeout if the model is consistently slow
- For alert retrieval timeouts, reduce the \`size\` parameter or narrow the time range

### unknown

**Fallback:** When the error does not match any of the above patterns.

**Remediation:**
- Examine the raw error message and stack trace
- Check Kibana server logs for additional context
- Review the workflow YAML for misconfigurations
- If the error is reproducible, gather the diagnostic report and escalate to support`,
        name: 'expanded-error-categories',
        relativePath: './references',
      },
    ],
  });
