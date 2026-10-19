/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { platformCoreTools, ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
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

/** Osquery registry tools bound when this skill loads (must match osquery plugin registrations). */
export const ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS = [
  `${internalNamespaces.osquery}.check_integration`,
  `${internalNamespaces.osquery}.list_saved_queries`,
  `${internalNamespaces.osquery}.get_table_schema`,
  `${internalNamespaces.osquery}.run_live_query`,
  `${internalNamespaces.osquery}.get_live_query_results`,
  `${internalNamespaces.osquery}.list_packs`,
  `${internalNamespaces.osquery}.resolve_agent_ids`,
] as const;

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

const escapeEsqlString = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const discoverTelemetrySchema = lazySchema(() =>
  z.object({
    hosts: z
      .array(z.string().max(255))
      .max(50)
      .optional()
      .describe(
        'Named host.name values extracted from the analyst question (max 50 hosts, 255 chars each)'
      ),
    time_window_hours: z
      .number()
      .int()
      .min(1)
      .max(720)
      .optional()
      .default(72)
      .describe('Lookback window in hours for forensic reconstruction'),
  })
);

const extractIocsSchema = lazySchema(() =>
  z.object({
    hosts: z
      .array(z.string().max(255))
      .min(1)
      .max(50)
      .describe('Named host.name values to extract IoCs from (at least one required, max 50)'),
    time_window_hours: z
      .number()
      .int()
      .min(1)
      .max(720)
      .optional()
      .default(72)
      .describe('Lookback window in hours for IoC extraction'),
  })
);

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

## Capability Detection (Phase 0 — ALWAYS FIRST)

Before selecting a query path, determine what data sources are available:

**Availability gate (read this before any \`osquery.*\` step).** The \`osquery.*\` tools are registered only when the Osquery Agent Builder tools are enabled on this deployment. If \`osquery.check_integration\` is not in your tool list, the entire Osquery path is unavailable: do not attempt any \`osquery.*\` call, answer from ES|QL / Defend telemetry, and say that live host interrogation is not available on this deployment. Do **not** report that outcome as "Osquery is not installed" — with no tool you cannot probe the integration, so the unprobed claim would be wrong. Every rule below that names an \`osquery.*\` tool applies only when those tools are present.

1. Call \`osquery.check_integration\` to see if the Osquery integration is installed and agents are enrolled.
2. **If \`enrollment_status\` is \`unknown\`**: the capability check itself failed (Fleet or package-policy error) — this is NOT the same as "no agents", and it is NOT "not installed": a failed check can also return \`installed: false\`. Say the check was inconclusive, answer from ES|QL / Defend telemetry, and suggest retrying the capability check. Evaluate this rule BEFORE any installed/not-installed rule.
3. **If Osquery IS installed and agents are enrolled**: for **live-state** questions (current processes, open sockets, loaded DLLs, registry keys as of now), route to the Osquery path (step 2b below). For **historical** questions (what happened in the past), use ES|QL on Defend telemetry.
4. **If Osquery IS installed but NO agents are enrolled** (\`installed: true\`, \`agents_enrolled: false\`): live interrogation is impossible even though the integration exists. Route all questions to the ES|QL / Defend telemetry path and tell the analyst live host interrogation needs an agent enrolled in an Osquery-capable agent policy. Do **not** call \`osquery.run_live_query\` — it has no agent to run on.
5. **If Osquery is NOT installed**: route all questions to the ES|QL / Defend telemetry path. Inform the analyst that live host interrogation requires the Osquery integration.

Use Osquery when the question asks for **current state** ("what processes are currently running", "which sockets are open right now").
Use ES|QL when the question asks for **historical events** ("what happened at 3am", "timeline of the attack", "patient zero").

Both paths can be combined in a single investigation when both integrations are available.

## Process

### 1. Discover telemetry scope
**On the ES|QL / Defend telemetry path only**, call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` first with host names and time window from the question. It resolves Defend telemetry indices and has no bearing on the Osquery live-state path — do not call it before \`osquery.run_live_query\`.

### 2a. Query with ES|QL (historical / Defend telemetry)
Use \`platform.core.generate_esql\` then \`platform.core.execute_esql\` against the recommended Defend indices.
Always scope \`@timestamp\`. Cite index and query in answers.

### 2b. Query with Osquery (live state — only when the \`osquery.*\` tools are available and \`check_integration\` reports a capable stack)
For live-state questions, use these Osquery tools in sequence (skip \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` — it is ES|QL-only):
- If the analyst references a pack by name, call \`osquery.list_packs\` FIRST — before authoring or dispatching any query — and use the pack's prebuilt queries rather than composing a custom one.
- \`osquery.list_saved_queries\` to find prebuilt queries matching the investigative need
- \`osquery.get_table_schema\` to verify column names before authoring a custom query
- \`osquery.resolve_agent_ids\` to turn host names into Elastic Agent IDs — \`run_live_query\` takes \`agent_ids\`, not host names. Do NOT query the \`.fleet-agents\` index via ES|QL/search; it requires ES-level privileges most roles lack and fails with a security_exception.
- \`osquery.run_live_query\` to dispatch a read-only SELECT query to enrolled agents (waits ~30s inline for rows)
- \`osquery.get_live_query_results\` when \`run_live_query\` returns \`status: dispatched\` or \`status: partial\` — pass the \`action_id\` and wait up to 60s for agent rows

Do not treat rows from a partial response as complete: follow up for pending agents and explicitly report any agents that remain unresolved. This path ends once the live-state results are returned and displayed — do NOT continue into steps 3–7 (patient zero, timeline, IoCs, lateral movement, persistence): those are historical ES|QL reconstruction and were not requested by a live-state question. Only combine paths when the analyst explicitly asks for both live and historical analysis.

After rows return, **display them in chat** as a markdown table (columns from the first row, cap at 20 rows with a note if truncated).

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
- Answering with a structured output schema that has a timeline field: that field is
  \`{ events }\`, where \`events\` is the ordered event array, earliest first, with each event as
  \`{ timestamp, host, description }\`. \`description\` carries the same detail you would have written
  for an analyst — do not shorten it to a label because it is going into a structured field.
  Do not also render the timeline in a free-text field.

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

Never emit a category whose values you cannot tie to evidence.

Where the indicators go depends on how you were asked to answer:
- Answering an analyst directly: render a markdown table — never a prose paragraph — so downstream hunts and
  response actions can cite specific values. One row per indicator (repeat the type), with columns:

| Indicator type | Value | First seen | Source event |
|---|---|---|---|

  Echo each \`value\` verbatim. Source event is the indicator's \`comment\`, enriched from the reconstruction.
  First seen is the earliest timestamp you have for that indicator; use "—" when you do not have one.
  Surface every category listed above; if a category has no hits, show one row with Value "—".
  If the tool result contains an \`error\` field, do NOT report "no indicators found" — say the extraction failed,
  report the error, and answer from the telemetry you already have.
- Answering with a structured output schema that has an indicators field: that field is the categories
  themselves, each a list of \`{ value, comment }\`. \`comment\` carries the same detail you would have written
  for an analyst — do not shorten it to a label because it is going into a structured field. Omit a category
  entirely when the reconstruction found nothing in it. Do not also render the indicators in a free-text field.

Do not automatically put observed network destinations in \`ips\`. The tool returns them separately in
\`observed_network_destinations\`; host/time scope alone does not establish compromise. Add only destinations
corroborated by the reconstructed attack to the \`ips\` category.

### 6. Lateral movement

Trace outbound internal connections from source host; correlate with process creation on destinations.

### 7. Persistence
Enumerate registry run keys, scheduled tasks, services, and startup items from telemetry indices.
When Osquery is available, cross-reference with live \`scheduled_tasks\` and \`startup_items\` tables.

## Tool Selection Guardrails

- **Always** call \`osquery.check_integration\` before using any other \`osquery.*\` tool — and only after confirming the \`osquery.*\` tools are in your tool list (see Phase 0). When they are not registered on this deployment, use the ES|QL / Defend telemetry path instead: never call a tool that is not in your tool list.
- **Always** call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` before ES|QL — and only on the ES|QL path.
- **Always** call \`osquery.resolve_agent_ids\` before \`osquery.run_live_query\`: the dispatch tool takes \`agent_ids\`, never host names.
- **Always** call \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` after reconstructing an attack on a host, to produce the structured indicators for downstream hunts.
- **Always** use \`platform.core.generate_esql\` and \`platform.core.execute_esql\` for historical forensic answers.
- Do **not** use \`platform.core.search\`, \`relevance_search\`, or repeated \`platform.core.list_indices\` for reconstruction — they cannot replace scoped ES|QL on Defend telemetry.
- Use \`platform.core.get_index_mapping\` only when field names are uncertain before generating ES|QL.
- Use \`osquery.run_live_query\` only for **read-only SELECT queries** on enrolled agents. Never attempt shell execution or mutating Osquery tables.
- When \`osquery.run_live_query\` returns \`status: dispatched\` or \`status: partial\`, **must** call \`osquery.get_live_query_results\` with the \`action_id\` before telling the analyst live dispatch is unavailable.
- When \`osquery.check_integration\` reports \`agents_enrolled: false\`, do **not** call \`osquery.run_live_query\`; answer from Defend telemetry and state the limitation.
- When a prebuilt saved query matches, prefer it over authoring a custom query.
`,
  getRegistryTools: () => [
    ...ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS,
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
        'Returns indicators grouped by category — shas, file_paths, malicious_commands, affected_hosts — ' +
        `each a deduplicated list of { value, comment }, capped at ${MAX_IOCS_PER_CATEGORY} per category, ` +
        'plus observed network destinations that require attack correlation before adding them to ips. ' +
        'Call this after forensic reconstruction to produce the indicators for cross-environment hunts and ' +
        'response actions. It only returns what telemetry fields can be typed mechanically — add ransom notes, ' +
        'encryption markers, and compromised identities from your own analysis.',
      schema: extractIocsSchema,
      handler: async (args, context) => {
        const { hosts, time_window_hours: timeWindowHours } = extractIocsSchema.parse(args);
        const hostFilter = hosts.map((h) => `"${escapeEsqlString(h)}"`).join(', ');
        // Sorting ascending before the limit keeps the truncated set anchored on the start of the
        // attack, so the comment each indicator keeps describes its earliest occurrence.
        const esqlQuery = [
          `FROM logs-endpoint.events.process-*, logs-endpoint.events.network-*, logs-endpoint.events.file-*, logs-endpoint.events.registry-*`,
          `| WHERE host.name IN (${hostFilter}) AND @timestamp >= NOW() - ${timeWindowHours} HOURS`,
          `| KEEP process.hash.sha256, file.hash.sha256, process.executable, process.name, process.command_line, process.parent.name, process.parent.command_line, destination.ip, destination.domain, registry.path, registry.value, file.path, user.name, event.action, host.name, @timestamp`,
          `| SORT @timestamp ASC`,
          `| LIMIT 500`,
        ].join(' ');

        // One map per category, keyed by value so a repeated indicator keeps the first comment it
        // was given — which, because the query sorts ascending, is its earliest occurrence.
        const byCategory = new Map<ExtractedIocCategory, Map<string, InvestigationIoc>>();
        const observedNetworkDestinations: string[] = [];

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
          const fileHashIdx = colIndex('file.hash.sha256');
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
            const filePath = asText(filePathIdx);
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
              'shas',
              at(fileHashIdx),
              filePath
                ? `SHA256 of ${filePath}${seenOn}`
                : `Observed in file telemetry${seenOn}`.trim()
            );

            const addObservedNetworkDestination = (value: unknown) => {
              if (
                typeof value !== 'string' ||
                value === '' ||
                observedNetworkDestinations.includes(value) ||
                observedNetworkDestinations.length >= MAX_IOCS_PER_CATEGORY
              ) {
                return;
              }
              observedNetworkDestinations.push(value);
            };
            const destinationIp = asText(ipIdx);
            if (
              destinationIp &&
              !/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.|0\.|169\.254\.|::1|fe80:|224\.|239\.)/i.test(
                destinationIp
              )
            ) {
              addObservedNetworkDestination(destinationIp);
            }
            addObservedNetworkDestination(at(domainIdx));
            addIndicator(
              'file_paths',
              exe,
              parentName ? `Executable launched by ${parentName}${seenOn}` : `Executable${seenOn}`
            );
            addIndicator(
              'file_paths',
              filePath,
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
                observed_network_destinations: observedNetworkDestinations,
                ...(queryError ? { error: queryError } : {}),
                guidance: queryError
                  ? 'The extraction query failed, so no categories were returned for that reason and not ' +
                    'because the hosts were clean. Fall back to the indicators you identified during reconstruction.'
                  : 'These categories are deduplicated — echo the values verbatim rather than rewriting or ' +
                    'merging them, and enrich each comment with what your reconstruction established. Observed ' +
                    'network destinations require attack correlation before adding them to ips. The categories ' +
                    'are a floor, not the full set: add ransom notes, encryption markers, and compromised identities ' +
                    'from the reconstruction.',
              },
            },
          ],
        };
      },
    },
  ],
});
