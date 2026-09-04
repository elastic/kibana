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

const discoverTelemetrySchema = z.object({
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
});

const extractIocsSchema = z.object({
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

### 2b. Query with Osquery (live state — when integration is installed)
For live-state questions, use these Osquery tools in sequence (skip \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` — it is ES|QL-only):
- If the analyst references a pack by name, call \`osquery.list_packs\` FIRST — before authoring or dispatching any query — and use the pack's prebuilt queries rather than composing a custom one.
- \`osquery.list_saved_queries\` to find prebuilt queries matching the investigative need
- \`osquery.get_table_schema\` to verify column names before authoring a custom query
- \`osquery.resolve_agent_ids\` to turn host names into Elastic Agent IDs — \`run_live_query\` takes \`agent_ids\`, not host names. Do NOT query the \`.fleet-agents\` index via ES|QL/search; it requires ES-level privileges most roles lack and fails with a security_exception.
- \`osquery.run_live_query\` to dispatch a read-only SELECT query to enrolled agents (waits ~30s inline for rows)
- \`osquery.get_live_query_results\` when \`run_live_query\` returns \`status: dispatched\` — pass the \`action_id\` and wait up to 60s for agent rows

This path ends once the live-state rows are returned and displayed — do NOT continue into steps 3–7 (patient zero, timeline, IoCs, lateral movement, persistence): those are historical ES|QL reconstruction and were not requested by a live-state question. Only combine paths when the analyst explicitly asks for both live and historical analysis.

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

- Fill the **First seen** column from the tool's \`first_seen_by_category\` field (earliest \`@timestamp\` for each category); use "—" only when the tool returned rows but the category had no hits.
- The **Source event** column should reference the telemetry indices queried (e.g. \`logs-endpoint.events.*\`); do not invent per-row event IDs.
- If the tool result contains an \`error\` field, do NOT report "no indicators found" — say the IoC extraction failed, report the error, and answer from the telemetry you already have. An empty IoC table means absence; an \`error\` means unknown.

Always surface at least the categories the tool returns (file hash, network destination, registry persistence key, renamed extension). If a category has no hits, show "—". Never present IoCs as a prose paragraph — use the table so downstream hunts and response actions can cite specific values.

### 6. Lateral movement
Trace outbound internal connections from source host; correlate with process creation on destinations.

### 7. Persistence
Enumerate registry run keys, scheduled tasks, services, and startup items from telemetry indices.
When Osquery is available, cross-reference with live \`scheduled_tasks\` and \`startup_items\` tables.

## Tool Selection Guardrails

- **Always** call \`osquery.check_integration\` before using any other \`osquery.*\` tool.
- **Always** call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` before ES|QL — and only on the ES|QL path.
- **Always** call \`osquery.resolve_agent_ids\` before \`osquery.run_live_query\`: the dispatch tool takes \`agent_ids\`, never host names.
- **Always** use \`platform.core.generate_esql\` and \`platform.core.execute_esql\` for historical forensic answers.
- Do **not** use \`platform.core.search\`, \`relevance_search\`, or repeated \`platform.core.list_indices\` for reconstruction — they cannot replace scoped ES|QL on Defend telemetry.
- Use \`platform.core.get_index_mapping\` only when field names are uncertain before generating ES|QL.
- Use \`osquery.run_live_query\` only for **read-only SELECT queries** on enrolled agents. Never attempt shell execution or mutating Osquery tables.
- When \`osquery.run_live_query\` returns \`status: dispatched\`, **must** call \`osquery.get_live_query_results\` with the \`action_id\` before telling the analyst live dispatch is unavailable.
- When \`osquery.check_integration\` reports \`agents_enrolled: false\`, do **not** call \`osquery.run_live_query\`; answer from Defend telemetry and state the limitation.
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
        'Returns a typed list of file hashes, network destinations, registry persistence keys, and renamed file extensions. ' +
        'Call this after forensic reconstruction to produce the IoC table for cross-environment hunts and response actions.',
      schema: extractIocsSchema,
      handler: async (args, context) => {
        const { hosts, time_window_hours: timeWindowHours } = extractIocsSchema.parse(args);
        const hostFilter = hosts.map((h) => `"${escapeEsqlString(h)}"`).join(', ');
        const esqlQuery = [
          `FROM logs-endpoint.events.process-*, logs-endpoint.events.network-*, logs-endpoint.events.file-*, logs-endpoint.events.registry-*`,
          `| WHERE host.name IN (${hostFilter}) AND @timestamp >= NOW() - ${timeWindowHours} HOURS`,
          `| KEEP process.hash.sha256, process.executable, process.parent.name, process.parent.command_line, destination.ip, destination.domain, registry.path, file.extension, file.Ext.original.extension, @timestamp`,
          `| SORT @timestamp ASC`,
          `| LIMIT 500`,
        ].join(' ');

        const iocs: Record<string, unknown[]> = {
          file_hashes: [],
          process_chain: [],
          network_destinations: [],
          registry_persistence_keys: [],
          file_extensions: [],
        };
        const firstSeenByCategory: Record<string, string> = {};
        let iocsError: string | undefined;
        let truncated = false;

        // IoC presence filters — without them every ordinary process, IP and
        // file on the host is reported as an indicator.
        const isRfc1918OrLocal = (ip: string): boolean =>
          /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.|0\.|169\.254\.|::1|fe80:)/i.test(
            ip
          ) || /^(224\.|239\.)/i.test(ip);
        const isSuspiciousExtension = (ext: string): boolean =>
          /^(exe|dll|scr|com|pif|bat|cmd|ps1|vbs|js|jse|hta|jar|lnk)$/i.test(ext);
        const COMMON_EXECUTABLES = new Set([
          'svchost.exe',
          'csrss.exe',
          'wininit.exe',
          'winlogon.exe',
          'services.exe',
          'lsass.exe',
          'smss.exe',
          'explorer.exe',
          'spoolsv.exe',
          'conhost.exe',
          'runtimebroker.exe',
          'sihost.exe',
          'taskhostw.exe',
          'dwm.exe',
          'ctfmon.exe',
        ]);
        const isNotableExecutable = (exe: string): boolean => {
          const name = exe.split('\\').pop()?.toLowerCase() ?? '';
          return (
            name !== '' && !COMMON_EXECUTABLES.has(name) && !/^(system32|syswow64)\//i.test(name)
          );
        };

        try {
          const { columns, values } = await context.esClient.asCurrentUser.esql.query({
            query: esqlQuery,
            drop_null_columns: true,
          });
          truncated = values.length >= 500;
          const colIndex = (name: string) => columns.findIndex((c) => c.name === name);

          const hashIdx = colIndex('process.hash.sha256');
          const exeIdx = colIndex('process.executable');
          const parentNameIdx = colIndex('process.parent.name');
          const parentCmdIdx = colIndex('process.parent.command_line');
          const ipIdx = colIndex('destination.ip');
          const domainIdx = colIndex('destination.domain');
          const regIdx = colIndex('registry.path');
          const extIdx = colIndex('file.extension');
          const origExtIdx = colIndex('file.Ext.original.extension');
          const tsIdx = colIndex('@timestamp');

          // Only persistence-location paths are IoCs; other registry.path
          // values are ordinary telemetry.
          const isPersistenceRegistryPath = (path: string): boolean =>
            /\\software\\microsoft\\windows\\currentversion\\run\b/i.test(path) ||
            /\\software\\microsoft\\windows\\currentversion\\runonce\b/i.test(path) ||
            /\\software\\wow6432node\\microsoft\\windows\\currentversion\\run\b/i.test(path) ||
            /\\software\\wow6432node\\microsoft\\windows\\currentversion\\runonce\b/i.test(path) ||
            /\\software\\microsoft\\windows\\currentversion\\explorer\\shell folders\b/i.test(
              path
            ) ||
            /\\software\\microsoft\\windows nt\\currentversion\\winlogon\b/i.test(path) ||
            /\\software\\microsoft\\windows\\currentversion\\explorer\\user shell folders\b/i.test(
              path
            ) ||
            /\\system\\currentcontrolset\\services\b/i.test(path);

          const firstSeen = (v: unknown[]): string | null => {
            const ts = tsIdx >= 0 ? v[tsIdx] : null;
            return typeof ts === 'string' ? ts : null;
          };
          const trackCategory = (category: string, v: unknown[]) => {
            const ts = firstSeen(v);
            if (ts && (!firstSeenByCategory[category] || ts < firstSeenByCategory[category])) {
              firstSeenByCategory[category] = ts;
            }
          };

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
            const origExt = origExtIdx >= 0 ? v[origExtIdx] : null;

            if (hash && typeof hash === 'string' && !iocs.file_hashes.includes(hash)) {
              iocs.file_hashes.push(hash);
              trackCategory('file_hashes', v);
            }
            if (
              exe &&
              typeof exe === 'string' &&
              parentName &&
              typeof parentName === 'string' &&
              isNotableExecutable(exe)
            ) {
              const chain = `${parentName} → ${exe}`;
              if (!iocs.process_chain.includes(chain)) {
                iocs.process_chain.push(chain);
                trackCategory('process_chain', v);
              }
            }
            if (
              parentCmd &&
              typeof parentCmd === 'string' &&
              parentName &&
              typeof exe === 'string' &&
              isNotableExecutable(exe) &&
              !iocs.process_chain.includes(`${parentName} (cmd: ${parentCmd.slice(0, 80)})`)
            ) {
              iocs.process_chain.push(`${parentName} (cmd: ${parentCmd.slice(0, 80)})`);
              trackCategory('process_chain', v);
            }
            // External destinations only — RFC1918/loopback/multicast are
            // ordinary host chatter, not indicators.
            if (
              typeof ip === 'string' &&
              !isRfc1918OrLocal(ip) &&
              !iocs.network_destinations.includes(ip)
            ) {
              iocs.network_destinations.push(ip);
              trackCategory('network_destinations', v);
            }
            if (
              domain &&
              typeof domain === 'string' &&
              !iocs.network_destinations.includes(domain)
            ) {
              iocs.network_destinations.push(domain);
              trackCategory('network_destinations', v);
            }
            if (
              regPath &&
              typeof regPath === 'string' &&
              isPersistenceRegistryPath(regPath) &&
              !iocs.registry_persistence_keys.includes(regPath)
            ) {
              iocs.registry_persistence_keys.push(regPath);
              trackCategory('registry_persistence_keys', v);
            }
            // A renamed double extension (report.pdf → report.pdf.exe) is the
            // IoC — surface the original→current pair when present, else a
            // suspicious current extension.
            if (ext && typeof ext === 'string') {
              if (
                origExt &&
                typeof origExt === 'string' &&
                origExt.toLowerCase() !== ext.toLowerCase()
              ) {
                const renamed = `${origExt} → ${ext}`;
                if (!iocs.file_extensions.includes(renamed)) {
                  iocs.file_extensions.push(renamed);
                  trackCategory('file_extensions', v);
                }
              } else if (isSuspiciousExtension(ext) && !iocs.file_extensions.includes(ext)) {
                iocs.file_extensions.push(ext);
                trackCategory('file_extensions', v);
              }
            }
          }
        } catch (e) {
          // Surface the failure so the model reports unknown, not absence.
          iocsError = `IoC extraction query failed: ${e instanceof Error ? e.message : String(e)}`;
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                hosts,
                time_window_hours: timeWindowHours,
                iocs,
                first_seen_by_category: firstSeenByCategory,
                ...(truncated && {
                  truncated: true,
                  note: 'Telemetry for the window exceeded 500 events; values are from the earliest 500. First-seen is accurate, the value set may be partial.',
                }),
                ...(iocsError !== undefined && { error: iocsError }),
                guidance:
                  'Present as a markdown table (one row per indicator type), then offer a cross-environment hunt with these values.',
              },
            },
          ],
        };
      },
    },
  ],
});
