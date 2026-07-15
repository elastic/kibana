/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType, platformCoreTools } from '@kbn/agent-builder-common';
import { listSearchSources } from '@kbn/agent-builder-genai-utils';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { securityTool } from '../../tools/constants';

export const ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID = 'endpoint-forensic-analysis';

export const ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID = securityTool(
  'endpoint_forensic_telemetry_discover'
);

const ENDPOINT_TELEMETRY_INDEX_PATTERNS = [
  'logs-endpoint.events.process-*',
  'logs-endpoint.events.network-*',
  'logs-endpoint.events.file-*',
  'logs-endpoint.events.registry-*',
] as const;

const ENDPOINT_TELEMETRY_RESOLVE_PATTERN = 'logs-endpoint.events.*';

/** Bounded resolveIndex lookup — same path as platform.core.list_indices. */
const DISCOVER_TELEMETRY_SOURCE_LIMIT = 50;

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
    'NOT alert triage by alert ID (use alert-analysis). NOT host isolation, kill process, or file retrieve (direct the analyst to Endpoint response actions in Security — no dedicated Agent Builder skill yet).',
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
- Host isolation / kill process / file retrieve → tell the analyst to use **Endpoint response actions** in Security (Fleet / Endpoint details). Do not invoke response-action tools from this skill.

## Scope (read-only)

This skill MUST NOT invoke response actions. On response-action requests, explain that this skill is read-only and direct the analyst to Endpoint response actions in Security; then stop.

## Process

### 1. Discover telemetry scope (when hosts or time window need scoping)
When the question names specific hosts or implies a lookback window, call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` to resolve Defend index patterns and scoped hosts before ES|QL. Skip when the question is already narrowly scoped and you can proceed directly to ES|QL on known \`logs-endpoint.events.*\` indices.

### 2. Query with ES|QL
Use \`platform.core.generate_esql\` then \`platform.core.execute_esql\` against the recommended Defend indices.
Always scope \`@timestamp\`. Cite index and query in answers.

### 3. Patient zero
Query process and network indices ordered by @timestamp ASC.
Return earliest host, timestamp, indicator, and delivery-vector hypothesis.

### 4. Attack timeline
Merge process, file, network, and registry events for the host in the time window; sort by \`@timestamp\` ascending.
Present the answer as an explicit chronological timeline — an ordered, timestamp-labeled sequence of events scoped to the named host — not a prose paragraph. **Only include events supported by query results.** If telemetry is sparse or unavailable, state the data gap explicitly and optionally provide a clearly labeled investigation plan (suggested ES|QL queries / indices to check) — do **not** present an expected attack sequence as that host's chronology.

### 5. Lateral movement
Trace outbound internal connections from source host; correlate with process creation on destinations.

### 6. Persistence
Enumerate registry run keys, scheduled tasks, services, and startup items from telemetry indices.

## Tool Selection Guardrails

- Call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` when host scope or time window is ambiguous — not required on every turn if ES|QL targets are already clear.
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
        let resolutionWarnings: string[] = [];
        try {
          const sources = await listSearchSources({
            pattern: ENDPOINT_TELEMETRY_RESOLVE_PATTERN,
            perTypeLimit: DISCOVER_TELEMETRY_SOURCE_LIMIT,
            includeHidden: false,
            excludeIndicesRepresentedAsAlias: true,
            excludeIndicesRepresentedAsDatastream: true,
            includeDatasets: false,
            esClient: context.esClient.asCurrentUser,
          });
          availableIndices = [
            ...sources.data_streams.map((dataStream) => dataStream.name),
            ...sources.indices.map((index) => index.name),
          ];
          resolutionWarnings = sources.warnings ?? [];
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          resolutionWarnings = [
            `Failed to resolve Defend telemetry indices for ${ENDPOINT_TELEMETRY_RESOLVE_PATTERN}: ${message}`,
          ];
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
                resolution_warnings: resolutionWarnings,
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
