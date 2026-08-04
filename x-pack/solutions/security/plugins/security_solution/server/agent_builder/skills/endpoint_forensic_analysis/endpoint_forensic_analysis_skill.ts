/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType, platformCoreTools } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { securityTool } from '../../tools/constants';

export const ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID = 'endpoint-forensic-analysis';

/** Osquery registry tools bound when this skill loads (must match osquery plugin registrations). */
export const ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS = [
  `${internalNamespaces.osquery}.check_integration`,
  `${internalNamespaces.osquery}.list_saved_queries`,
  `${internalNamespaces.osquery}.get_table_schema`,
  `${internalNamespaces.osquery}.run_live_query`,
  `${internalNamespaces.osquery}.get_live_query_results`,
  `${internalNamespaces.osquery}.list_packs`,
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

## Capability Detection (Phase 0 — ALWAYS FIRST)

Before selecting a query path, determine what data sources are available:

1. Call \`osquery.check_integration\` to see if the Osquery integration is installed and agents are enrolled.
2. **If Osquery IS installed and agents are enrolled**: for **live-state** questions (current processes, open sockets, loaded DLLs, registry keys as of now), route to the Osquery path (steps 2b–6b below). For **historical** questions (what happened in the past), use ES|QL on Defend telemetry.
3. **If Osquery is NOT installed**: route all questions to the ES|QL / Defend telemetry path. Inform the analyst that live host interrogation requires the Osquery integration.

Use Osquery when the question asks for **current state** ("what processes are currently running", "which sockets are open right now").
Use ES|QL when the question asks for **historical events** ("what happened at 3am", "timeline of the attack", "patient zero").

Both paths can be combined in a single investigation when both integrations are available.

## Process

### 1. Discover telemetry scope
Call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` first with host names and time window from the question.

### 2a. Query with ES|QL (historical / Defend telemetry)
Use \`platform.core.generate_esql\` then \`platform.core.execute_esql\` against the recommended Defend indices.
Always scope \`@timestamp\`. Cite index and query in answers.

### 2b. Query with Osquery (live state — when integration is installed)
For live-state questions, use these Osquery tools in sequence:
- \`osquery.list_saved_queries\` to find prebuilt queries matching the investigative need
- \`osquery.get_table_schema\` to verify column names before authoring a custom query
- \`osquery.run_live_query\` to dispatch a read-only SELECT query to enrolled agents (waits ~30s inline for rows)
- \`osquery.get_live_query_results\` when \`run_live_query\` returns \`status: dispatched\` — pass the \`action_id\` and wait up to 60s for agent rows
- \`osquery.list_packs\` to find Elastic-built packs when the analyst references a pack by name

After rows return, **display them in chat** as a markdown table (columns from the first row, cap at 20 rows with a note if truncated).

### 3. Patient zero
Query process and network indices ordered by @timestamp ASC.
Return earliest host, timestamp, indicator, and delivery-vector hypothesis.

### 4. Attack timeline
Merge process, file, network, and registry events for the host in the time window; sort by \`@timestamp\` ascending.
Present the answer as an explicit chronological timeline — an ordered, timestamp-labeled sequence of events scoped to the named host — not a prose paragraph. **Only include events supported by query results.** If telemetry is sparse or unavailable, state the data gap explicitly and optionally provide a clearly labeled investigation plan (suggested ES|QL queries / indices to check) — do **not** present an expected attack sequence as that host's chronology.

### 5. IoC extraction
After reconstructing the attack on a host, call \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` with the host(s) and time window to produce a structured IoC summary. Present the result as a markdown table with one row per indicator type:

| Indicator type | Value | First seen | Source event |
|---|---|---|---|

Always surface at least the categories the tool returns (file hash, network destination, registry persistence key, mutex, renamed extension). If a category has no hits, show "—". Never present IoCs as a prose paragraph — use the table so downstream hunts and response actions can cite specific values.

**Mutex coverage (second-tier Osquery source — REQUIRED, not optional).** The \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` tool cannot return mutexes from Elastic Defend telemetry. After calling it, act on the \`osquery_mutex_guidance\` block in its result:

1. Call \`osquery.check_integration\`. If unavailable/enrolled-less, render the mutex IoC row as \`— (requires Osquery integration)\` and note it in the summary.
2. If available: resolve each host to its Elastic Agent ID by calling \`osquery.resolve_agent_ids\` (do NOT query the \`.fleet-agents\` index directly via ES|QL/search — that system index requires ES-level privileges most roles lack and fails with a security_exception), then call \`osquery.run_live_query\` with the winbaseobj Mutant query from the guidance block.
3. Filter out benign system mutexes (\`SM0:*\`, \`WilStaging_*\`, \`_MSI*\`) and add surviving named-mutex values to the IoC table mutex row.
4. Only after the mutex row is populated (or explicitly marked unavailable) is IoC extraction complete — proceed to the cross-environment hunt offer.

This makes the mutex a genuine second-tier IoC source read from the live host, not a documented gap.

### 6. Lateral movement
Trace outbound internal connections from source host; correlate with process creation on destinations.

### 7. Persistence
Enumerate registry run keys, scheduled tasks, services, and startup items from telemetry indices.
When Osquery is available, cross-reference with live \`scheduled_tasks\` and \`startup_items\` tables.

## Tool Selection Guardrails

- **Always** call \`osquery.check_integration\` before using any other \`osquery.*\` tool.
- **Always** call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` before ES|QL.
- **Always** use \`platform.core.generate_esql\` and \`platform.core.execute_esql\` for historical forensic answers.
- Do **not** use \`platform.core.search\`, \`relevance_search\`, or repeated \`platform.core.list_indices\` for reconstruction — they cannot replace scoped ES|QL on Defend telemetry.
- Use \`platform.core.get_index_mapping\` only when field names are uncertain before generating ES|QL.
- Use \`osquery.run_live_query\` only for **read-only SELECT queries** on enrolled agents. Never attempt shell execution or mutating Osquery tables.
- When \`osquery.run_live_query\` returns \`status: dispatched\`, **must** call \`osquery.get_live_query_results\` with the \`action_id\` before telling the analyst live dispatch is unavailable.
- When a prebuilt saved query matches, prefer it over authoring a custom query.
`,
  getRegistryTools: () => [
    ...ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS,
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
        'PLUS an osquery_mutex_guidance block — the executable Osquery winbaseobj query and host→agent_id resolution ' +
        'needed to fill the mutex IoC row from the live host (Defend telemetry has no mutex field). ' +
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

        // Mutexes are NOT in Elastic Defend telemetry (no dedicated ES|QL-queryable field).
        // The genuine source is the Osquery `winbaseobj` live table (object_type = 'Mutant'),
        // which IS in the schema catalog and passes the run_live_query allowlist. Emit a
        // structured guidance block the agent MUST act on via osquery.run_live_query — this
        // is not a documentation-only constraint; it is an executable next step.
        const osqueryMutexGuidance = {
          indicator_type: 'mutex',
          why_esql_cannot_cover:
            'Elastic Defend telemetry has no dedicated mutex field. Named mutexes (a classic malware IoC) must be read from the live host via Osquery.',
          required_tool: 'osquery.run_live_query',
          query: "SELECT object_name, session_id FROM winbaseobj WHERE object_type = 'Mutant'",
          query_explanation:
            "winbaseobj lists named Windows kernel objects across terminal-services sessions; object_type = 'Mutant' filters to mutexes. Returns the mutex name(s) a process created — these are the IoC values to hunt for fleet-wide.",
          catalog_table: 'winbaseobj (Windows-only, in osquery v5.19.0 schema catalog)',
          agent_resolution:
            'run_live_query takes agent_ids, not host names. Call osquery.resolve_agent_ids with the hostnames to get each Elastic Agent ID — do NOT query the .fleet-agents index directly via ES|QL/search, it requires ES-level privileges most roles lack and will fail with a security_exception.',
          after_query:
            'Filter out benign system mutexes (SM0:*, WilStaging_*, _MSI*). Add surviving named-mutex values to the IoC table under the mutex row before offering the cross-environment hunt.',
          availability_gate:
            'Before dispatching, call osquery.check_integration. If Osquery is not installed/enrolled, report mutex as "— (requires Osquery integration)" rather than skipping the indicator type.',
        };

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                hosts,
                time_window_hours: timeWindowHours,
                iocs,
                osquery_mutex_guidance: osqueryMutexGuidance,
                guidance:
                  'Present as a markdown table (one row per indicator type, mutex row included). Then: (1) execute the osquery_mutex_guidance via osquery.run_live_query to fill the mutex row with real values; (2) offer the cross-environment hunt per the Cross-Skill Handoff section.',
              },
            },
          ],
        };
      },
    },
  ],
});
