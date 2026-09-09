/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { securityTool } from '../../tools/constants';

export const ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID = 'endpoint-forensic-analysis';

export const ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID = securityTool(
  'endpoint_forensic.discover_telemetry'
);

export const ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID = securityTool(
  'endpoint_forensic.extract_iocs'
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

const extractIocsSchema = z.object({
  hosts: z
    .array(z.string())
    .describe('Named host.name values to extract IoCs from (at least one required)'),
  time_window_hours: z
    .number()
    .int()
    .min(1)
    .max(720)
    .optional()
    .default(72)
    .describe('Lookback window in hours for IoC extraction'),
});

export const endpointForensicAnalysisSkill = defineSkillType({
  id: ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID,
  name: ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID,
  basePath: 'skills/security/endpoint',
  description:
    'Endpoint DFIR forensic reconstruction (read-only): patient zero identification across enrolled hosts, ' +
    'host-scoped attack timelines, lateral movement chains between named hosts, and persistence enumeration. ' +
    'Use for incident-scoped questions naming specific hosts or outbreaks — NOT fleet-wide proactive hunts (use threat-hunting). ' +
    'NOT alert triage by alert ID (use alert-analysis). NOT host isolation, kill process, or file retrieve (direct the analyst to Endpoint response actions in Security — no dedicated Agent Builder skill yet). ' +
    'NOT conflicting/incompatible antivirus or security software, policy or configuration failures, endpoint health or missed check-ins, ' +
    'performance/resource troubleshooting, or output/integration failures — even when the question names a specific host ' +
    '(use elastic-defend-configuration-troubleshooting).',
  content: `# Endpoint Forensic Analysis

## When to Use

Load when the analyst asks about a **specific host or incident** and needs forensic reconstruction:
- Patient zero identification
- Attack timeline on a named host
- Lateral movement chain between hosts
- Persistence mechanism enumeration

Naming a specific host is **not** sufficient on its own — the question must also require forensic reconstruction (timeline, patient zero, lateral movement, persistence), not configuration/health/software-conflict diagnosis. See "Do not load" below.

Do **not** load for:
- Fleet-wide proactive hunts → threat-hunting
- Alert triage from alert id only → alert-analysis
- Host isolation / kill process / file retrieve → tell the analyst to use **Endpoint response actions** in Security (Fleet / Endpoint details). Do not invoke response-action tools from this skill.
- Conflicting or incompatible security software, including antivirus/AV software (e.g. "does host X have conflicting antivirus", third-party AV conflicts) → elastic-defend-configuration-troubleshooting. Naming a specific host does **not** make this a forensic question — antivirus/AV conflict detection is always configuration troubleshooting, never forensic reconstruction.
- Policy/configuration failures → elastic-defend-configuration-troubleshooting
- Endpoint health and missed check-ins → elastic-defend-configuration-troubleshooting
- Performance/resource troubleshooting → elastic-defend-configuration-troubleshooting
- Output or integration failures → elastic-defend-configuration-troubleshooting

## Scope (read-only)

This skill MUST NOT invoke response actions. On response-action requests, explain that this skill is read-only and direct the analyst to Endpoint response actions in Security; then stop.

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
Merge process, file, network, and registry events for the host in the time window; sort by \`@timestamp\` ascending.
Present the answer as an explicit chronological timeline — an ordered, timestamp-labeled sequence of events scoped to the
named host — not a prose paragraph. **Only include events supported by query results.** If telemetry is sparse or
unavailable, still lay out the ordered reconstruction as a timeline skeleton (the sequence of stages to expect for that host),
so the response remains a scoped chronological narrative. State the data gap explicitly and optionally provide a
clearly labeled investigation plan (suggested ES|QL queries / indices to check).

### 5. IoC extraction
After reconstructing the attack on a host, call \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` with the host(s) and
time window to produce a structured IoC summary. Present the result as a markdown table with one row per indicator type:

| Indicator type | Value | First seen | Source event |
|---|---|---|---|

Always surface at least the categories the tool returns (file hash, network destination, registry persistence key). If a category has no hits, show "—". Never present IoCs as a prose
paragraph — use the table so downstream hunts and response actions can cite specific values.

### 6. Lateral movement

Trace outbound internal connections from source host; correlate with process creation on destinations.

### 7. Persistence
Enumerate registry run keys, scheduled tasks, services, and startup items from telemetry indices.

## Tool Selection Guardrails

- **Always** call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` before ES|QL.
- **Always** call \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` after reconstructing an attack on a host, to produce the structured IoC table for downstream hunts.
- **Always** use \`platform.core.generate_esql\` and \`platform.core.execute_esql\` for historical forensic answers.
- Do **not** use \`platform.core.search\` or \`relevance_search\` for reconstruction — they cannot replace scoped ES|QL on Defend telemetry.
- Use \`platform.core.get_index_mapping\` only when field names are uncertain before generating ES|QL.
`,
  getRegistryTools: () => [
    platformCoreTools.listIndices,
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
    {
      id: ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID,
      type: ToolType.builtin,
      description:
        'Extract structured indicators of compromise (IoCs) from Defend telemetry for named host(s). ' +
        'Returns a typed list of file hashes, network destinations, registry persistence keys, and renamed file extensions, ' +
        'Call this after forensic reconstruction to produce the IoC table for cross-environment hunts and response actions.',
      schema: extractIocsSchema,
      handler: async (args, context) => {
        const { hosts, time_window_hours: timeWindowHours } = extractIocsSchema.parse(args);
        const hostFilter = hosts.map((h) => `"${h}"`).join(', ');
        const esqlQuery = [
          `FROM logs-endpoint.events.process-*, logs-endpoint.events.network-*, logs-endpoint.events.file-*, logs-endpoint.events.registry-*`,
          `| WHERE host.name IN (${hostFilter}) AND @timestamp >= NOW() - ${timeWindowHours} HOURS`,
          `| KEEP process.hash.sha256, process.executable, process.parent.name, process.parent.command_line, destination.ip, destination.domain, registry.path, registry.value, file.extension, event.action, host.name, @timestamp`,
          `| LIMIT 500`,
        ].join(' ');

        const iocs: Record<string, unknown[]> = {
          file_hashes: [],
          process_chain: [],
          network_destinations: [],
          registry_persistence_keys: [],
          file_extensions: [],
        };

        try {
          const { columns, values } = await context.esClient.asCurrentUser.esql.query({
            query: esqlQuery,
            drop_null_columns: true,
          });
          const colIndex = (name: string) => columns.findIndex((c) => c.name === name);

          const hashIdx = colIndex('process.hash.sha256');
          const exeIdx = colIndex('process.executable');
          const parentNameIdx = colIndex('process.parent.name');
          const parentCmdIdx = colIndex('process.parent.command_line');
          const ipIdx = colIndex('destination.ip');
          const domainIdx = colIndex('destination.domain');
          const regIdx = colIndex('registry.path');
          const extIdx = colIndex('file.extension');

          for (const row of values) {
            const v = row as unknown[];
            const hash = hashIdx >= 0 ? v[hashIdx] : null;
            const exe = exeIdx >= 0 ? v[exeIdx] : null;
            const parentName = parentNameIdx >= 0 ? v[parentNameIdx] : null;
            const parentCmd = parentCmdIdx >= 0 ? v[parentCmdIdx] : null;
            const ip = ipIdx >= 0 ? v[ipIdx] : null;
            const domain = domainIdx >= 0 ? v[domainIdx] : null;
            const regPath = regIdx >= 0 ? v[regIdx] : null;
            const ext = extIdx >= 0 ? v[extIdx] : null;

            if (hash && typeof hash === 'string' && !iocs.file_hashes.includes(hash)) {
              iocs.file_hashes.push(hash);
            }
            if (exe && typeof exe === 'string' && parentName && typeof parentName === 'string') {
              const chain = `${parentName} → ${exe}`;
              if (!iocs.process_chain.includes(chain)) {
                iocs.process_chain.push(chain);
              }
            }
            if (
              parentCmd &&
              typeof parentCmd === 'string' &&
              parentName &&
              !iocs.process_chain.includes(`${parentName} (cmd: ${parentCmd.slice(0, 80)})`)
            ) {
              iocs.process_chain.push(`${parentName} (cmd: ${parentCmd.slice(0, 80)})`);
            }
            const netDest = domain ?? ip;
            if (
              netDest &&
              typeof netDest === 'string' &&
              !iocs.network_destinations.includes(netDest)
            ) {
              iocs.network_destinations.push(netDest);
            }
            if (
              regPath &&
              typeof regPath === 'string' &&
              !iocs.registry_persistence_keys.includes(regPath)
            ) {
              iocs.registry_persistence_keys.push(regPath);
            }
            if (ext && typeof ext === 'string' && !iocs.file_extensions.includes(ext)) {
              iocs.file_extensions.push(ext);
            }
          }
        } catch {
          // Index missing or query error — return empty structure so the agent can report "no hits"
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                hosts,
                time_window_hours: timeWindowHours,
                iocs,
                guidance: 'Present as a markdown table (one row per indicator type).',
              },
            },
          ],
        };
      },
    },
  ],
});
