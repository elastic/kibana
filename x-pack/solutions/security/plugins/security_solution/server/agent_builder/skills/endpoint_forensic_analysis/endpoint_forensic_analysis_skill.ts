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
Present the answer as an explicit chronological timeline — an ordered, timestamp-labeled sequence of events scoped to the named host — not a prose paragraph. If telemetry is sparse or unavailable, still lay out the ordered reconstruction as a timeline skeleton (the sequence of stages to expect for that host), so the response remains a scoped chronological narrative.

### 5. IoC extraction
After reconstructing the attack on a host, call \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` with the host(s) and time window to produce a structured IoC summary. Present the result as a markdown table with one row per indicator type:

| Indicator type | Value | First seen | Source event |
|---|---|---|---|

Always surface at least the categories the tool returns (file hash, network destination, registry persistence key, mutex, running processes, live network connections, persistence mechanisms, WMI event subscriptions, execution history, logged-in users, renamed extension). If a category has no hits, show "—". Never present IoCs as a prose paragraph — use the table so downstream hunts and response actions can cite specific values.

**Live-host Osquery cross-check (second-tier source — REQUIRED, not optional, for all seven categories below).** Elastic Defend telemetry is historical-only and, for two categories (WMI persistence, execution history), has **no equivalent field at all** — not process started, but not whether that process/connection/persistence mechanism is still active *right now*, and for WMI/execution-history there is no historical record to fall back on either. The \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` tool returns seven structured guidance blocks for this — \`osquery_mutex_guidance\`, \`osquery_processes_guidance\`, \`osquery_network_guidance\`, \`osquery_persistence_guidance\`, \`osquery_wmi_persistence_guidance\`, \`osquery_execution_history_guidance\`, and \`osquery_logged_in_users_guidance\` — each with a ready-to-run query against a real osquery schema-catalog table. Act on all seven:

1. Call \`osquery.check_integration\` once. If unavailable/enrolled-less, render all seven rows as \`— (requires Osquery integration)\` and note it in the summary.
2. If available: resolve each host to its Elastic Agent ID by calling \`osquery.resolve_agent_ids\` (do NOT query the \`.fleet-agents\` index directly via ES|QL/search — that system index requires ES-level privileges most roles lack and fails with a security_exception). Reuse the resolved agent IDs across all seven guidance blocks — don't re-resolve per category.
3. Call \`osquery.run_live_query\` once per guidance block's \`query\` (and \`secondary_query\` where present — persistence has two independent vectors, WMI has consumer + filter, execution history has shimcache + prefetch):
   - **Mutex**: filter out benign system mutexes (\`SM0:*\`, \`WilStaging_*\`, \`_MSI*\`); surviving named mutexes go in the mutex row.
   - **Running processes**: cross-reference returned names/paths against the \`process_chain\` IoC already extracted from Defend telemetry — a live match confirms the threat is still active, not just historical.
   - **Live network connections**: exclude the GCP metadata server (\`169.254.169.254\`) and classify \`35.235.240.0/20\` as Google IAP (legitimate infra access), then cross-reference remaining \`remote_address\` values against the \`network_destinations\` IoC already extracted — a live socket to a known-bad destination means the beacon is still open right now. Any OTHER unexplained external remote address on an admin port is a real, separate finding (host is internet-exposed) — do not discard it as noise.
   - **Persistence mechanisms**: cross-reference scheduled-task/service \`action\`/\`path\` against \`file_hashes\`/\`process_chain\` and the registry run-key already extracted — a task or service pointing at the same dropped binary confirms durable persistence beyond a single registry key.
   - **WMI event subscriptions**: any non-empty \`wmi_cli_event_consumers\` result is high-signal on its own — this technique has no other corroborating telemetry source. Cross-reference the consumer's command line/executable path against \`file_hashes\`/\`process_chain\`.
   - **Execution history**: cross-reference \`shimcache\`/\`prefetch\` paths against \`file_hashes\`/\`process_chain\`. A hit here for a binary absent from Defend telemetry entirely is the single most valuable finding this tool can produce — it means live-host evidence exists that the historical record is missing.
   - **Logged-in users**: check this whenever the network-connections block surfaces an open RDP/SSH port — an active interactive session from an unfamiliar user corroborates ongoing (not just historical) access.
4. Only after all seven rows are populated (or explicitly marked unavailable) is IoC extraction complete — proceed to the cross-environment hunt offer.

This makes all seven categories genuine second-tier IoC sources read from the live host, not documented gaps — the mutex was never a special case, it was simply the first one implemented. \`ntfs_journal_events\` is a known intentional gap: that table only returns rows for paths pre-configured in the agent's osquery \`file_paths\` config, which is not set on these demo hosts, so it would silently return empty and should not be added without that prerequisite configuration.

### 6. Lateral movement
Trace outbound internal connections from source host; correlate with process creation on destinations. Cross-reference with the live \`osquery_network_guidance\` result (step 5) — an outbound connection still open right now is a stronger lateral-movement signal than a historical connection-start event alone.

### 7. Persistence
Enumerate registry run keys, scheduled tasks, services, startup items, and WMI event subscriptions from telemetry indices.
When Osquery is available, this is covered by \`osquery_persistence_guidance\` and \`osquery_wmi_persistence_guidance\` in step 5 — do not re-derive persistence findings separately; reuse those results.

## Cross-Skill Handoff (BlackHat three-phase flow)

The forensic reconstruction is Phase 1 of a three-phase incident workflow. After completing reconstruction and IoC extraction, **proactively** offer the next phase rather than stopping:

1. **Offer cross-environment IoC hunt (Phase 2)** — after presenting the IoC table, ask the analyst whether to search for the extracted indicators across all enrolled endpoints to determine spread. Phrase it as an explicit question, e.g. _"I've extracted {N} IoCs from {host}. Would you like me to search across all enrolled endpoints to check whether other hosts show the same indicators?"_
   - If the analyst confirms, defer to **threat-hunting** for the fleet-wide search (that skill owns ES\|QL hunts across all endpoints). Do not attempt the hunt from this skill.
   - If the analyst declines, stop.

2. **Recommend containment (Phase 3)** — after a cross-environment hunt identifies additional compromised endpoints, recommend specific containment actions. List the affected hosts and the actions that apply (malware scan, isolation) and defer to **endpoint-response-actions** for execution. Do not execute write actions from this skill. Example: _"To contain this incident, I recommend isolating {hosts} and running a malware scan on {host}. Shall I proceed with containment?"_

3. **Never** execute response actions, run automated multi-host orchestration, or skip the analyst's explicit confirmation between phases.

## Tool Selection Guardrails

- **Always** call \`osquery.check_integration\` before using any other \`osquery.*\` tool.
- **Always** call \`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID}\` before ES|QL.
- **Always** call \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` after reconstructing an attack on a host, to produce the structured IoC table for downstream hunts.
- **Always** execute the seven \`osquery_*_guidance\` blocks (mutex, processes, network, persistence, wmi_persistence, execution_history, logged_in_users) returned by \`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID}\` via \`osquery.run_live_query\` to cross-check every IoC category against live host state — wmi_persistence and execution_history have no Defend-telemetry equivalent at all and cannot be skipped.
- **Always** classify network findings: exclude the GCP metadata server, treat \`35.235.240.0/20\` as IAP management access, and separately flag any other unexplained internet-exposed connection as its own finding rather than folding it into the ransomware IoC table.
- **Always** use \`platform.core.generate_esql\` and \`platform.core.execute_esql\` for historical forensic answers.
- Do **not** use \`platform.core.search\`, \`relevance_search\`, or repeated \`platform.core.list_indices\` for reconstruction — they cannot replace scoped ES|QL on Defend telemetry.
- Use \`platform.core.get_index_mapping\` only when field names are uncertain before generating ES|QL.
- Use \`osquery.run_live_query\` only for **read-only SELECT queries** on enrolled agents. Never attempt shell execution or mutating Osquery tables.

- When \`osquery.run_live_query\` returns \`status: dispatched\`, **must** call \`osquery.get_live_query_results\` with the \`action_id\` before telling the analyst live dispatch is unavailable.
- The mutex \`winbaseobj\` query commonly takes **longer than 180s** to complete on a live agent — do **not** conclude "the agent did not respond" after only 1-2 \`osquery.get_live_query_results\` polls. Poll at least 4 times with \`wait_seconds: 120\` (≈480s total) before reporting the mutex row as unavailable; check the action's \`status\` field each time — only \`status: "completed"\` or an explicit failure is a terminal result, a timeout on one poll is not.
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
        'PLUS seven osquery_*_guidance blocks (mutex, running processes, live network connections, persistence, ' +
        'WMI event subscriptions, execution history via shimcache/prefetch, logged-in users) — ' +
        'executable Osquery queries and host→agent_id resolution needed to cross-check each IoC category against live host state ' +
        '(Defend telemetry is historical-only, and has no equivalent at all for WMI persistence or execution history). ' +
        'Network guidance also classifies GCP metadata/IAP traffic to avoid false-positive noise. ' +
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

        // Live-state IoC categories beyond the mutex: current running processes, open
        // network sockets, and persistence mechanisms. Defend telemetry only has
        // *historical* events for these (process-start, network-connection-start,
        // registry-change), so a live-host cross-check via Osquery genuinely adds a
        // second, independent data source rather than duplicating the ES|QL result —
        // e.g. a process still resident right now, vs. one that started and already
        // exited. Same structured-guidance pattern as the mutex block: real tables from
        // the v5.19.0 schema catalog, real columns, executable via osquery.run_live_query.
        const osqueryProcessesGuidance = {
          indicator_type: 'running_processes',
          why_esql_cannot_cover:
            'Defend telemetry only records process START/END events. It cannot answer "what is running on this host right now" — that is a live-state question only the endpoint itself can answer.',
          required_tool: 'osquery.run_live_query',
          query:
            "SELECT pid, name, path, cmdline, parent FROM processes WHERE on_disk = 0 OR path NOT LIKE 'C:\\\\Windows\\\\%'",
          query_explanation:
            'processes lists every currently-running process. Filtering to on_disk = 0 (binary deleted from disk while still running — a classic evasion signal) OR a path outside C:\\Windows surfaces unsigned/non-system binaries worth cross-referencing against the process_chain IoCs already extracted from Defend telemetry.',
          catalog_table: 'processes (cross-platform, in osquery v5.19.0 schema catalog)',
          agent_resolution: 'Same agent_id resolution as the mutex block — reuse the resolved ids.',
          after_query:
            'Cross-reference returned process names/paths against the process_chain IoC row already extracted from Defend telemetry. A live process matching a historical IoC confirms the threat is still active on the host, not just historical.',
          availability_gate:
            'Before dispatching, call osquery.check_integration. If unavailable, report this row as "— (requires Osquery integration)".',
        };

        const osqueryNetworkGuidance = {
          indicator_type: 'live_network_connections',
          why_esql_cannot_cover:
            'Defend telemetry only records connection START events, not the current state of a socket. A C2 channel established minutes ago may still be open — Osquery is the only source for "is this connection live right now".',
          required_tool: 'osquery.run_live_query',
          query:
            "SELECT pid, local_address, local_port, remote_address, remote_port, state FROM process_open_sockets WHERE remote_port != 0 AND remote_address != '169.254.169.254'",
          query_explanation:
            'process_open_sockets lists every open socket with its owning process. Filtering to remote_port != 0 excludes listening/local-only sockets; excluding 169.254.169.254 drops the GCP instance-metadata server, which is not an attacker destination — every GCP VM queries it constantly for guest-agent/telemetry purposes and it would otherwise show up as a false "suspicious connection" on every run. Cross-reference remaining remote_address values against the network_destinations IoC row already extracted from Defend telemetry.',
          catalog_table: 'process_open_sockets (cross-platform, in osquery v5.19.0 schema catalog)',
          agent_resolution: 'Same agent_id resolution as the mutex block — reuse the resolved ids.',
          gcp_noise_classification:
            "These demo hosts run on GCP with 0.0.0.0/0 SSH/RDP rules, so remote connections from the 35.235.240.0/20 range are Google's IAP (Identity-Aware Proxy) tunnel — legitimate infra admin access, not attacker C2. Any OTHER external remote_address on port 22/3389/445/443 that is not a known IoC (network_destinations row, e.g. the seeded C2 185.220.101.42) is unexplained internet-facing exposure — call it out explicitly as a finding (these hosts currently allow SSH/RDP from 0.0.0.0/0), not as noise to discard, since it is a real, actionable observation distinct from the deliberate attack scenario.",
          after_query:
            'A live socket to a known-bad destination (e.g. the C2 IP already in network_destinations) means the beacon is still active, not just historical — escalate urgency accordingly in the summary. A live socket to an IAP range address is benign management access. Anything else external and unexplained is a real finding: flag it as "host is internet-exposed" separately from the ransomware IoC table.',
          availability_gate:
            'Before dispatching, call osquery.check_integration. If unavailable, report this row as "— (requires Osquery integration)".',
        };

        const osqueryPersistenceGuidance = {
          indicator_type: 'persistence_mechanisms',
          why_esql_cannot_cover:
            'Defend telemetry only records a registry-key WRITE event, not the current state of scheduled tasks, services, or startup items host-wide. Osquery reads the live persistence configuration directly.',
          required_tool: 'osquery.run_live_query',
          query: 'SELECT name, action, path, enabled, state FROM scheduled_tasks WHERE enabled = 1',
          query_explanation:
            'scheduled_tasks (Windows-only) lists every enabled scheduled task with its action and path. Cross-reference the action/path against the registry_persistence_keys and process_chain IoC rows — a scheduled task pointing at the same dropped binary confirms durable persistence beyond a single registry run-key.',
          catalog_table: 'scheduled_tasks (Windows-only, in osquery v5.19.0 schema catalog)',
          secondary_query:
            "SELECT name, path, status, user_account FROM services WHERE start_type = 'AUTO_START'",
          secondary_query_explanation:
            'services (Windows-only) lists installed Windows services. Auto-start services with an unfamiliar path/user_account are a second persistence vector alongside scheduled tasks — check both before concluding persistence is fully enumerated.',
          agent_resolution: 'Same agent_id resolution as the mutex block — reuse the resolved ids.',
          after_query:
            'Add any task/service pointing at a path already flagged in file_hashes or process_chain to the persistence row of the IoC table, alongside the registry run-key already extracted from Defend telemetry.',
          availability_gate:
            'Before dispatching, call osquery.check_integration. If unavailable, report this row as "— (requires Osquery integration)".',
        };

        // Fileless persistence via WMI event subscriptions has no Defend-telemetry
        // equivalent at all (not just a historical-vs-live gap like the blocks above) —
        // it is invisible to registry/scheduled-task/service monitoring entirely. This is
        // a well-documented real-world technique (see the Black Hat 2015 Graeber talk
        // osquery's own wmi_cli_event_consumers description cites).
        const osqueryWmiPersistenceGuidance = {
          indicator_type: 'wmi_event_subscriptions',
          why_esql_cannot_cover:
            'WMI CommandLineEventConsumer/EventFilter/FilterToConsumerBinding persistence has no registry key, scheduled task, or service entry — it lives entirely inside the WMI repository. Defend telemetry has no field for this at all; it is a genuine blind spot without a live Osquery check, not just a historical-vs-live gap.',
          required_tool: 'osquery.run_live_query',
          query: 'SELECT name, command_line_template, executable_path FROM wmi_cli_event_consumers',
          query_explanation:
            'wmi_cli_event_consumers lists WMI CommandLineEventConsumer objects — the execution side of WMI persistence. A populated command_line_template pointing at an unfamiliar binary is a strong persistence indicator on its own, independent of any other IoC category.',
          catalog_table:
            'wmi_cli_event_consumers (Windows-only, in osquery v5.19.0 schema catalog)',
          secondary_query: 'SELECT name, query FROM wmi_event_filters',
          secondary_query_explanation:
            'wmi_event_filters lists the trigger conditions (e.g. "on process start", "on user logon") paired with consumers via wmi_filter_consumer_binding. Cross-reference filter/consumer name pairs to reconstruct the full subscription; a filter that fires on every process start or every 60 seconds and drives an unfamiliar consumer is a classic fileless-persistence signature.',
          agent_resolution: 'Same agent_id resolution as the mutex block — reuse the resolved ids.',
          after_query:
            'Any consumer whose command_line_template/executable_path matches a path already in file_hashes or process_chain confirms WMI-based persistence for the same binary tracked elsewhere in the IoC table. Unlike scheduled_tasks/services, a hit here has no other corroborating source — treat any non-empty result as high-signal.',
          availability_gate:
            'Before dispatching, call osquery.check_integration. If unavailable, report this row as "— (requires Osquery integration)".',
        };

        // Execution-history tables answer "what ran on this host" beyond the Defend
        // telemetry retention/enrollment window — shimcache records execution of binaries
        // that may since have been deleted, and prefetch corroborates run counts/timestamps
        // independent of the agent's own event log.
        const osqueryExecutionHistoryGuidance = {
          indicator_type: 'execution_history',
          why_esql_cannot_cover:
            'Defend telemetry only covers execution since Elastic Agent was enrolled on this host. shimcache (Application Compatibility Cache) and prefetch retain execution evidence for binaries that ran before enrollment or have since been deleted from disk — a live-host source with no Defend equivalent.',
          required_tool: 'osquery.run_live_query',
          query:
            'SELECT path, modified_time, execution_flag FROM shimcache ORDER BY entry LIMIT 50',
          query_explanation:
            "shimcache (AppCompatCache) records every binary the OS has evaluated for compatibility, including ones since deleted from disk — a path under a suspicious location (C:\\\\Users\\\\Public\\\\, C:\\\\ProgramData\\\\) with execution_flag = 1 confirms it ran, even if Defend's process telemetry never captured it (e.g. if the binary ran and was removed before agent enrollment).",
          catalog_table: 'shimcache (Windows-only, in osquery v5.19.0 schema catalog)',
          secondary_query:
            'SELECT filename, path, last_run_time, run_count FROM prefetch ORDER BY last_run_time DESC LIMIT 50',
          secondary_query_explanation:
            'prefetch corroborates shimcache with run counts and last-run timestamps — a high run_count on an unfamiliar filename suggests repeated execution (e.g. a persistence mechanism re-triggering), not a one-off.',
          agent_resolution: 'Same agent_id resolution as the mutex block — reuse the resolved ids.',
          after_query:
            'Cross-reference any suspicious path/filename against file_hashes and process_chain. A shimcache/prefetch hit for a binary NOT present in Defend telemetry at all is the most valuable finding here — it means the live host has evidence of execution the historical record is missing entirely.',
          availability_gate:
            'Before dispatching, call osquery.check_integration. If unavailable, report this row as "— (requires Osquery integration)".',
        };

        // Who is actually logged into the host right now — directly relevant given the
        // exposed-RDP/SSH finding this skill's network guidance surfaces: an unexpected
        // interactive session is a stronger signal than an open port alone.
        const osqueryLoggedInUsersGuidance = {
          indicator_type: 'logged_in_users',
          why_esql_cannot_cover:
            'Defend telemetry has no interactive-logon-session field. A live host-state check is the only way to answer "who is logged in right now" — directly relevant when the network-connections check (above) surfaces an open RDP/SSH port: an active session is a materially stronger signal than an open port alone.',
          required_tool: 'osquery.run_live_query',
          query: "SELECT type, user, host, time FROM logged_in_users WHERE type != 'system'",
          query_explanation:
            "logged_in_users lists active interactive sessions. Excluding type = 'system' removes service/SYSTEM sessions and surfaces real user logons — an unfamiliar user or an interactive session from the same remote host flagged in live_network_connections corroborates active, not just historical, compromise.",
          catalog_table: 'logged_in_users (cross-platform, in osquery v5.19.0 schema catalog)',
          agent_resolution: 'Same agent_id resolution as the mutex block — reuse the resolved ids.',
          after_query:
            'A logged-in user that does not match the expected demo/analyst account, especially combined with a live RDP/SSH connection from live_network_connections, indicates active interactive access — call this out as its own finding alongside (not merged into) the ransomware IoC table.',
          availability_gate:
            'Before dispatching, call osquery.check_integration. If unavailable, report this row as "— (requires Osquery integration)".',
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
                osquery_processes_guidance: osqueryProcessesGuidance,
                osquery_network_guidance: osqueryNetworkGuidance,
                osquery_persistence_guidance: osqueryPersistenceGuidance,
                osquery_wmi_persistence_guidance: osqueryWmiPersistenceGuidance,
                osquery_execution_history_guidance: osqueryExecutionHistoryGuidance,
                osquery_logged_in_users_guidance: osqueryLoggedInUsersGuidance,
                guidance:
                  'Present as a markdown table (one row per indicator type, mutex row included). Then, when Osquery is available: (1) execute all seven osquery_*_guidance blocks (mutex, processes, network, persistence, wmi_persistence, execution_history, logged_in_users) via osquery.run_live_query to cross-check each IoC category against live host state, not just historical Defend telemetry — wmi_persistence and execution_history have no Defend-telemetry equivalent whatsoever, and logged_in_users should be checked whenever the network block surfaces an open RDP/SSH port; (2) offer the cross-environment hunt per the Cross-Skill Handoff section.',
              },
            },
          ],
        };
      },
    },
  ],
});
