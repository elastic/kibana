/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { securityTool } from '../../tools/constants';

export const ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID = 'endpoint-forensic-analysis';

export const ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID = securityTool(
  'endpoint_forensic.discover_telemetry'
);

const ENDPOINT_TELEMETRY_INDEX_PATTERNS = [
  'logs-endpoint.events.process-*',
  'logs-endpoint.events.network-*',
  'logs-endpoint.events.file-*',
  'logs-endpoint.events.registry-*',
] as const;

const discoverTelemetrySchema = z.object({
  hosts: z
    .array(z.string())
    .optional()
    .describe('Named host.name values extracted from the analyst question'),
  time_window_hours: z
    .number()
    .int()
    .min(1)
    .max(720)
    .optional()
    .default(72)
    .describe('Lookback window in hours for forensic reconstruction'),
});

export const endpointForensicAnalysisSkill = defineSkillType({
  id: ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID,
  name: ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID,
  basePath: 'skills/security/endpoint',
  description:
    'Endpoint DFIR forensic reconstruction (read-only): patient zero identification across enrolled hosts, ' +
    'host-scoped attack timelines, lateral movement chains between named hosts, and persistence enumeration. ' +
    'Use for incident-scoped questions naming specific hosts or outbreaks — NOT fleet-wide proactive hunts (use threat-hunting). ' +
    'NOT alert triage by alert ID (use alert-analysis). NOT response actions (use endpoint-response-actions).',
  content: `# Endpoint Forensic Analysis

## When to Use

Load when the analyst asks about a **specific host or incident** and needs forensic reconstruction:
- Patient zero identification
- Attack timeline on a named host
- Lateral movement chain between hosts
- Persistence mechanism enumeration

Do **not** load for:
- Fleet-wide proactive hunts → threat-hunting
- Alert triage from alert id only → alert-analysis
- Host isolation / kill process / file retrieve → endpoint-response-actions

## Scope (read-only)

This skill MUST NOT invoke response actions. On response-action requests, hand off to endpoint-response-actions and stop.

## Process

### 1. Discover telemetry scope
Call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` first with host names and time window from the question.

### 2. Query with ES|QL
Use \`platform.core.generate_esql\` then \`platform.core.execute_esql\` against the recommended Defend indices.
Always scope \`@timestamp\`. Cite index and query in answers.

### 3. Patient zero
Query process and network indices ordered by @timestamp ASC.
Return earliest host, timestamp, indicator, and delivery-vector hypothesis.

### 4. Attack timeline
Merge process, file, network, and registry events for the host in the time window; sort chronologically.

### 5. Lateral movement
Trace outbound internal connections from source host; correlate with process creation on destinations.

### 6. Persistence
Enumerate registry run keys, scheduled tasks, services, and startup items from telemetry indices.

## Tool Selection Guardrails

- **Always** call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` before ES|QL.
- **Always** use \`platform.core.generate_esql\` and \`platform.core.execute_esql\` for forensic answers.
- Do **not** use \`platform.core.search\`, \`relevance_search\`, or repeated \`platform.core.list_indices\` for reconstruction — they cannot replace scoped ES|QL on Defend telemetry.
- Use \`platform.core.get_index_mapping\` only when field names are uncertain before generating ES|QL.
`,
  getRegistryTools: () => [
    platformCoreTools.getIndexMapping,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
  ],
  getInlineTools: () => [
    {
      id: ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID,
      type: ToolType.builtin,
      description:
        'Resolve Defend telemetry index patterns and scoped hosts for endpoint forensic reconstruction. ' +
        'Call this before generate_esql/execute_esql on patient-zero, timeline, lateral-movement, or persistence tasks.',
      schema: discoverTelemetrySchema,
      handler: async (args, context) => {
        const { hosts, time_window_hours: timeWindowHours } = discoverTelemetrySchema.parse(args);

        let availableIndices: string[] = [];
        try {
          const catResponse = await context.esClient.asCurrentUser.cat.indices({
            index: 'logs-endpoint.events.*',
            format: 'json',
            h: 'index',
          });
          availableIndices = (catResponse as Array<{ index?: string }>)
            .map((row) => row.index)
            .filter((index): index is string => Boolean(index));
        } catch {
          availableIndices = [];
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                recommended_indices: [...ENDPOINT_TELEMETRY_INDEX_PATTERNS],
                available_indices: availableIndices,
                scoped_hosts: hosts ?? [],
                time_window_hours: timeWindowHours,
                guidance:
                  'Next: platform.core.generate_esql then platform.core.execute_esql scoped to @timestamp and host.name.',
              },
            },
          ],
        };
      },
    },
  ],
});
