/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { InvestigationIocCategory } from '../../attachments/investigation_iocs';
import { MAX_IOCS_PER_CATEGORY } from '../../attachments/investigation_iocs';
import { securityTool } from '../../tools/constants';

interface InvestigationIoc {
  value: string;
  comment?: string;
}

/**
 * The categories this tool can fill from telemetry fields alone. Ransom notes, encryption markers,
 * and compromised identities require interpreting the attack, so the agent adds those itself.
 */
type ExtractedIocCategory = Extract<
  InvestigationIocCategory,
  'shas' | 'ips' | 'file_paths' | 'malicious_commands' | 'affected_hosts'
>;

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
The answer is an explicit chronological timeline — an ordered, timestamp-labeled sequence of events scoped to the
named host — never a prose paragraph. **Only include events supported by query results.** If telemetry is sparse or
unavailable, still lay out the ordered reconstruction as a timeline skeleton (the sequence of stages to expect for that host),
so the response remains a scoped chronological narrative. State the data gap explicitly and optionally provide a
clearly labeled investigation plan (suggested ES|QL queries / indices to check).

Every event must name the host it happened on and describe what happened with the specifics an analyst can act on:
the process and its parent, PIDs, the acting user, the command line (truncated if long), file paths, destination
address and port, the registry key written, and the alert rule name or MITRE technique when the telemetry carries one.
"Lateral movement observed" is a classification, not a description — say which process on which host reached which
destination over which protocol.

Where the timeline goes depends on how you were asked to answer:
- Answering an analyst directly: render it as the timestamp-labeled sequence described above.
- Answering with a structured output schema that has a timeline field: that field is the ordered event array
  itself, earliest first, with each event as \`{ timestamp, host, description }\`. \`description\` carries the same
  detail you would have written for an analyst — do not shorten it to a label because it is going into a
  structured field. Do not also render the timeline in a free-text field.

### 5. IoC extraction
After reconstructing the attack on a host, call \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` with the host(s) and
time window. It returns indicators grouped by category, each a deduplicated list of \`{ value, comment }\`. Echo the
values verbatim — never rewrite, merge, or re-categorize one.

The categories are:
- \`shas\` — file hashes
- \`ips\` — C2 and other network destinations
- \`file_paths\` — dropped payloads, staging paths, persistence keys
- \`malicious_commands\` — the command lines you attributed to the attack
- \`ransom_note\` — ransom note paths
- \`encryption_marker\` — markers of encryption such as a renamed file extension
- \`compromised_identities\` — accounts that were used by the attacker or stolen
- \`affected_hosts\` — every host the attack touched

The tool is a **floor, not the full set**: it can only fill \`shas\`, \`ips\`, \`file_paths\`, \`malicious_commands\`,
and \`affected_hosts\` from telemetry fields. You must add \`ransom_note\`, \`encryption_marker\`, and
\`compromised_identities\` yourself from the reconstruction, and enrich the categories it did return. If the tool
returns an \`error\` field, the missing categories mean the query failed, not that the hosts were clean — fall back
entirely to your own reconstruction and say so.

Give every indicator a \`comment\` saying what makes it meaningful; a bare hash or address is not actionable. A
hash's comment says what it was dropped as and on which hosts ("seen as dropped update.dll on WKSTN-RECV01, as
svc.exe on SRV-DC01"). A C2 address's says which hosts contacted it and over what protocol. An identity's says how it
was compromised and what it was then used for. An affected host's says its role — patient zero, encrypted domain
controller, spread with no alert coverage.

Omit a category entirely when the reconstruction found nothing in it. Never emit a category whose values you cannot
tie to evidence.

Where the indicators go depends on how you were asked to answer:
- Answering an analyst directly: render one labelled group per category, one line per indicator, as
  \`value — comment\`. Never present IoCs as a prose paragraph.
- Answering with a structured output schema that has an indicators field: return the categories in that field and do
  not also render them in a free-text field.

### 6. Lateral movement

Trace outbound internal connections from source host; correlate with process creation on destinations.

### 7. Persistence
Enumerate registry run keys, scheduled tasks, services, and startup items from telemetry indices.

## Tool Selection Guardrails

- **Always** call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` before ES|QL.
- **Always** call \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` after reconstructing an attack on a host, to produce the structured indicators for downstream hunts.
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
        'Returns indicators grouped by category — shas, ips, file_paths, malicious_commands, affected_hosts — ' +
        `each a deduplicated list of { value, comment }, capped at ${MAX_IOCS_PER_CATEGORY} per category. ` +
        'Call this after forensic reconstruction to produce the indicators for cross-environment hunts and ' +
        'response actions. It only returns what telemetry fields can be typed mechanically — add ransom notes, ' +
        'encryption markers, and compromised identities from your own analysis.',
      schema: extractIocsSchema,
      handler: async (args, context) => {
        const { hosts, time_window_hours: timeWindowHours } = extractIocsSchema.parse(args);
        const hostFilter = hosts.map((h) => `"${h}"`).join(', ');
        // Sorting ascending before the limit keeps the truncated set anchored on the start of the
        // attack, so the comment each indicator keeps describes its earliest occurrence.
        const esqlQuery = [
          `FROM logs-endpoint.events.process-*, logs-endpoint.events.network-*, logs-endpoint.events.file-*, logs-endpoint.events.registry-*`,
          `| WHERE host.name IN (${hostFilter}) AND @timestamp >= NOW() - ${timeWindowHours} HOURS`,
          `| KEEP process.hash.sha256, process.executable, process.name, process.command_line, process.parent.name, process.parent.command_line, destination.ip, destination.domain, registry.path, registry.value, file.path, user.name, event.action, host.name, @timestamp`,
          `| SORT @timestamp ASC`,
          `| LIMIT 500`,
        ].join(' ');

        // One map per category, keyed by value so a repeated indicator keeps the first comment it
        // was given — which, because the query sorts ascending, is its earliest occurrence.
        const byCategory = new Map<ExtractedIocCategory, Map<string, InvestigationIoc>>();

        const addIndicator = (category: ExtractedIocCategory, value: unknown, comment?: string) => {
          if (typeof value !== 'string' || value === '') {
            return;
          }
          const existing = byCategory.get(category) ?? new Map<string, InvestigationIoc>();
          byCategory.set(category, existing);
          // The per-category cap keeps a host with thousands of distinct command lines from
          // crowding out hashes and network destinations.
          if (existing.has(value) || existing.size >= MAX_IOCS_PER_CATEGORY) {
            return;
          }
          existing.set(value, { value, ...(comment ? { comment } : {}) });
        };

        let queryError: string | undefined;

        try {
          const { columns, values } = await context.esClient.asCurrentUser.esql.query({
            query: esqlQuery,
            drop_null_columns: true,
          });
          const colIndex = (name: string) => columns.findIndex((c) => c.name === name);

          const hashIdx = colIndex('process.hash.sha256');
          const exeIdx = colIndex('process.executable');
          const processNameIdx = colIndex('process.name');
          const cmdIdx = colIndex('process.command_line');
          const parentNameIdx = colIndex('process.parent.name');
          const parentCmdIdx = colIndex('process.parent.command_line');
          const ipIdx = colIndex('destination.ip');
          const domainIdx = colIndex('destination.domain');
          const regIdx = colIndex('registry.path');
          const regValueIdx = colIndex('registry.value');
          const filePathIdx = colIndex('file.path');
          const userIdx = colIndex('user.name');
          const actionIdx = colIndex('event.action');
          const hostIdx = colIndex('host.name');

          for (const row of values) {
            const v = row as unknown[];
            const at = (index: number) => (index >= 0 ? v[index] : null);
            const asText = (index: number) => {
              const value = at(index);
              return typeof value === 'string' && value !== '' ? value : undefined;
            };

            const host = asText(hostIdx);
            const exe = asText(exeIdx);
            const processName = asText(processNameIdx) ?? exe;
            const parentName = asText(parentNameIdx);
            const user = asText(userIdx);
            const action = asText(actionIdx);
            const registryValue = asText(regValueIdx);

            const seenOn = host ? ` on ${host}` : '';
            const actor = [
              processName ? `by ${processName}` : undefined,
              user ? `as ${user}` : undefined,
            ]
              .filter(Boolean)
              .join(' ');

            addIndicator(
              'shas',
              at(hashIdx),
              exe ? `SHA256 of ${exe}${seenOn}` : `Observed${seenOn}`.trim()
            );
            addIndicator(
              'ips',
              at(ipIdx),
              `Outbound destination contacted${seenOn}${actor ? ` ${actor}` : ''}`
            );
            addIndicator(
              'ips',
              at(domainIdx),
              `Domain resolved and contacted${seenOn}${actor ? ` ${actor}` : ''}`
            );
            addIndicator(
              'file_paths',
              exe,
              parentName ? `Executable launched by ${parentName}${seenOn}` : `Executable${seenOn}`
            );
            addIndicator(
              'file_paths',
              at(filePathIdx),
              `${action ? `File ${action}` : 'File touched'}${seenOn}${actor ? ` ${actor}` : ''}`
            );
            addIndicator(
              'file_paths',
              at(regIdx),
              [
                `Registry key written${seenOn}`,
                registryValue ? `set to ${registryValue}` : undefined,
              ]
                .filter(Boolean)
                .join(', ')
            );
            addIndicator(
              'malicious_commands',
              at(cmdIdx),
              parentName ? `Run by ${processName} under ${parentName}${seenOn}` : `Run${seenOn}`
            );
            addIndicator(
              'malicious_commands',
              at(parentCmdIdx),
              processName
                ? `Parent command line of ${processName}${seenOn}`
                : `Parent command${seenOn}`
            );
            addIndicator('affected_hosts', host, 'Telemetry matched the investigation scope');
          }
        } catch (error) {
          // Surfaced rather than swallowed: an empty result caused by a missing index or a broken
          // query must not be reported to the analyst as "these hosts had no indicators".
          queryError = error instanceof Error ? error.message : String(error);
        }

        const iocs = Object.fromEntries(
          [...byCategory.entries()]
            .filter(([, values]) => values.size > 0)
            .map(([category, values]) => [category, [...values.values()]])
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                ...iocs,
                scoped_hosts: hosts,
                time_window_hours: timeWindowHours,
                ...(queryError ? { error: queryError } : {}),
                guidance: queryError
                  ? 'The extraction query failed, so no categories were returned for that reason and not ' +
                    'because the hosts were clean. Fall back to the indicators you identified during reconstruction.'
                  : 'These categories are deduplicated — echo the values verbatim rather than rewriting or ' +
                    'merging them, and enrich each comment with what your reconstruction established. They are ' +
                    'a floor, not the full set: this query can only type telemetry fields mechanically, so add ' +
                    'the ransom_note, encryption_marker, and compromised_identities categories yourself.',
              },
            },
          ],
        };
      },
    },
  ],
});
