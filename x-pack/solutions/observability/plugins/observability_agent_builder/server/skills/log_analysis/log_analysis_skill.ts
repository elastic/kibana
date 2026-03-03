/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
  OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
  OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
} from '../../tools';
import { OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID } from '../../tools/get_log_change_points/tool';

export const logAnalysisSkill = defineSkillType({
  id: 'log-analysis',
  name: 'log-analysis',
  basePath: 'skills/observability/logs',
  description:
    'Log investigation and analysis: discover log patterns, identify log rate anomalies, ' +
    'detect change points in log volumes, and explore index schemas for field discovery. ' +
    'Use when investigating log spikes, error patterns, or understanding log data structure.',
  content: `# Log Analysis Guide

## When to Use This Skill

Use this skill when:
- Investigating sudden increases or decreases in log volume
- Identifying recurring error patterns or log message groups
- Detecting change points where log behavior shifted
- Discovering available log indices and their field schemas
- Correlating log patterns with service or infrastructure incidents

## Field Discovery

Before using field names in kqlFilter or groupBy parameters, call 'observability.get_index_info' first.
Clusters use different naming conventions (ECS vs OpenTelemetry) — discovering fields first prevents errors.

## Log Analysis Process

### 1. Index Discovery
- Use 'observability.get_index_info' to discover available log indices and their field mappings
- Identify the correct index patterns for the data source (e.g., logs-*, filebeat-*)
- Check field types and naming conventions (ECS: message, log.level vs OTel: body.text, severity_text)

### 2. Log Rate Analysis
- Use 'observability.run_log_rate_analysis' to identify statistically significant changes in log rates
- This tool automatically finds the most important field/value combinations explaining rate changes
- Use it when log volume suddenly spikes or drops — it identifies what's different
- Provide specific time ranges around the anomaly for best results

### 3. Log Pattern Discovery
- Use 'observability.get_log_groups' to identify recurring log message patterns
- Patterns are grouped by message similarity, revealing the most frequent log categories
- Look for error patterns, warning clusters, and unusual message types
- Use kqlFilter to scope to specific services, hosts, or log levels

### 4. Change Point Detection
- Use 'observability.get_log_change_points' to find statistical change points in log metrics
- Change points indicate where behavior shifted — useful for pinpointing incident start times
- Compare change point timestamps with deployment events or configuration changes

### 5. Synthesis
- Correlate log anomalies with service metrics and infrastructure events
- Establish timeline: when did log patterns change? What preceded the change?
- Identify root cause indicators in log messages (stack traces, connection errors, timeout messages)
- Recommend: log-based alerts, index pattern adjustments, or investigation with service/infra skills

## KQL Syntax Reference
- Match: \`field: value\`, \`field: (a OR b OR c)\`
- Range: \`field > 100\`, \`field >= 10 AND field <= 20\`
- Wildcards: \`field: prefix*\` (trailing only)
- Negation: \`NOT field: value\`
- Logical: combine with AND/OR, use parentheses for precedence
- Exact phrases: \`message: "connection refused"\`

## Best Practices
- Always call get_index_info before constructing queries with field names
- Start with broad time ranges then narrow to anomaly windows
- Use log rate analysis to find statistically significant changes, not just volume
- Combine log patterns with service metrics for stronger root cause evidence
- Look for correlated log groups across multiple services for distributed issues`,
  referencedContent: [
    {
      relativePath: './queries',
      name: 'log-spike-investigation',
      content: `# Log Spike Investigation Pattern

1. \`observability.get_index_info\` — discover available log indices and fields
2. \`observability.run_log_rate_analysis\` with start/end around the spike — find what changed
3. \`observability.get_log_groups\` with kqlFilter for affected service — identify error patterns
4. \`observability.get_log_change_points\` — pinpoint when behavior shifted
5. Cross-reference with service-investigation skill if service metrics are also affected`,
    },
  ],
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    platformCoreTools.productDocumentation,
    OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
    OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
    OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
    OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
  ],
});
