/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ToolType, ToolResultType, platformCoreTools } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { securityTool } from '../../tools/constants';

export const DEEP_WATCH_FORENSICS_SKILL_ID = 'deep-watch-forensics';

/**
 * Osquery registry tools bound when this skill loads (must match osquery plugin
 * registrations). Mirrors ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS in
 * endpoint_forensic_analysis_skill.ts — Deep Watch additionally binds
 * resolve_agent_ids directly (rather than relying on prose-only guidance) since
 * live-state confirmation during specialist reconstruction routinely needs to
 * resolve a hostname to an Elastic Agent ID before dispatching a query.
 */
export const DEEP_WATCH_OSQUERY_TOOL_IDS = [
  `${internalNamespaces.osquery}.check_integration`,
  `${internalNamespaces.osquery}.list_saved_queries`,
  `${internalNamespaces.osquery}.get_table_schema`,
  `${internalNamespaces.osquery}.run_live_query`,
  `${internalNamespaces.osquery}.get_live_query_results`,
  `${internalNamespaces.osquery}.list_packs`,
  `${internalNamespaces.osquery}.resolve_agent_ids`,
] as const;

/**
 * Custom index for persisting draft forensic reports.
 *
 * Temporary until the platform Investigation (Agent Builder templated
 * conversation) object model is ready; at that point Deep Watch will write
 * its drafts as Investigation artifacts and this index will be deprecated.
 *
 * Uses the `.kibana` prefix to avoid requiring a separate migration and to
 * keep it within the Kibana system-index access pattern that Agent Builder
 * tool handlers already have via `context.esClient.asCurrentUser`.
 *
 * NOTE: this is the interactive-chat write path only (produce_draft_forensic_report
 * called directly, e.g. by the L4 durable-outcome eval spec
 * kbn-evals-suite-security-deep-watch-forensics/evals/durable_outcome.spec.ts).
 * The workflow-driven path (watch_deep_worker.yaml -> _emit_proposal) does NOT
 * go through this tool or this index — it writes straight to PND's
 * InvestigationStore via the emit_proposal route. Both paths are real; they
 * serve different callers (ad-hoc specialist chat vs. the automated Watch
 * pipeline) and are not currently reconciled into one write path.
 */
export const DEEP_WATCH_FORENSICS_REPORTS_INDEX = '.kibana-deep-watch-forensics-reports';

export const DEEP_WATCH_PACKAGE_EVIDENCE_TOOL_ID = securityTool('deep_watch.package_evidence');

let reportsIndexEnsuredPromise: Promise<void> | undefined;

async function ensureReportsIndex(esClient: ElasticsearchClient): Promise<void> {
  if (!reportsIndexEnsuredPromise) {
    reportsIndexEnsuredPromise = (async () => {
      try {
        const exists = await esClient.indices.exists({
          index: DEEP_WATCH_FORENSICS_REPORTS_INDEX,
        });
        if (!exists) {
          await esClient.indices.create({
            index: DEEP_WATCH_FORENSICS_REPORTS_INDEX,
            mappings: {
              dynamic: false,
              properties: {
                '@timestamp': { type: 'date' },
                report_status: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                scope: {
                  properties: {
                    hosts: { type: 'keyword' },
                    time_window_hours: { type: 'integer' },
                    mitre_techniques: { type: 'keyword' },
                  },
                },
                timeline_event_count: { type: 'integer' },
                validated_iocs: { type: 'object', enabled: false },
                persistence_findings: { type: 'text' },
                remediation_recommendations: { type: 'text' },
                unresolved_questions: { type: 'text' },
                confidence_assessment: {
                  properties: {
                    overall: { type: 'keyword' },
                  },
                },
              },
            },
          });
        }
      } catch (e) {
        // A concurrent call may have created the index between our `exists`
        // check and `create` — that race is harmless (resource_already_exists);
        // any other error should surface via the caller's own try/catch around
        // the subsequent index() write.
        if (!(e as { message?: string }).message?.includes('resource_already_exists')) {
          throw e;
        }
      }
    })();
  }
  return reportsIndexEnsuredPromise;
}

interface IocInput {
  type: string;
  value: string;
}

/**
 * Returns an ES|QL validation query for a known IoC type, or null for
 * unrecognised types so the caller can mark them as `unable_to_validate`.
 */
function buildIocValidationQuery(ioc: IocInput): string | null {
  switch (ioc.type) {
    case 'file_hash':
      return `FROM logs-endpoint.events.process-*, logs-endpoint.events.file-* | WHERE process.hash.sha256 == "${ioc.value}" OR file.hash.sha256 == "${ioc.value}" | KEEP @timestamp, host.name | LIMIT 1`;
    case 'network_destination':
      return `FROM logs-endpoint.events.network-* | WHERE destination.ip == "${ioc.value}" OR destination.domain == "${ioc.value}" | KEEP @timestamp, host.name | LIMIT 1`;
    case 'registry_key':
      return `FROM logs-endpoint.events.registry-* | WHERE registry.path LIKE "${ioc.value}*" | KEEP @timestamp, host.name | LIMIT 1`;
    default:
      return null;
  }
}

export const DEEP_WATCH_PRODUCE_DRAFT_TOOL_ID = securityTool(
  'deep_watch.produce_draft_forensic_report'
);

const ENDPOINT_TELEMETRY_INDEX_PATTERNS = [
  'logs-endpoint.events.process-*',
  'logs-endpoint.events.network-*',
  'logs-endpoint.events.file-*',
  'logs-endpoint.events.registry-*',
] as const;

// ── Schemas ──────────────────────────────────────────────────────────────────

const packageEvidenceSchema = z.object({
  source_watch: z
    .enum(['dark-watch', 'watch-floor', 'watch-officer', 'attack-discovery', 'manual'])
    .describe('Which Watch or capability escalated this analysis request'),
  source_reference: z
    .string()
    .optional()
    .describe('Identifier for the source — Proposal ID, alert ID, threat report name, or SSE ID'),
  hosts: z.array(z.string()).describe('Named host.name values in scope of the evidence package'),
  time_window_hours: z
    .number()
    .int()
    .min(1)
    .max(720)
    .optional()
    .default(72)
    .describe('Lookback window in hours for evidence collection'),
  iocs: z
    .array(
      z.object({
        type: z.enum([
          'file_hash',
          'network_destination',
          'registry_key',
          'process_name',
          'mutex',
          'dns_domain',
        ]),
        value: z.string(),
      })
    )
    .optional()
    .describe('IoCs extracted from the upstream Watch or analyst input'),
  mitre_techniques: z
    .array(z.string())
    .optional()
    .describe(
      'MITRE ATT&CK technique IDs extracted by the upstream Dark Watch threat-intel analysis'
    ),
  open_questions: z
    .array(z.string())
    .optional()
    .describe('Unresolved questions carried forward from the upstream Watch'),
  scope_constraints: z
    .object({
      allowed_autonomy_level: z
        .enum(['propose', 'execute_read', 'execute_write'])
        .optional()
        .default('propose')
        .describe('MVP default: propose-only — Deep Watch recommends, never executes'),
      sensitivity: z.enum(['standard', 'sensitive', 'restricted']).optional().default('standard'),
    })
    .optional()
    .describe('Scope constraints from the escalation (FR-DP-02)'),
});

const produceDraftSchema = z.object({
  hosts: z.array(z.string()).describe('Hosts scoped to the draft forensic report'),
  time_window_hours: z
    .number()
    .int()
    .min(1)
    .max(720)
    .optional()
    .default(72)
    .describe('Lookback window for the forensic analysis'),
  source_iocs: z
    .array(
      z.object({
        type: z.string(),
        value: z.string(),
      })
    )
    .optional()
    .describe('IoCs from the evidence package to validate against telemetry'),
  mitre_techniques: z
    .array(z.string())
    .optional()
    .describe('MITRE ATT&CK technique IDs to correlate with timeline events'),
});

// ── Skill Definition ─────────────────────────────────────────────────────────

export const deepWatchForensicsSkill = defineSkillType({
  id: DEEP_WATCH_FORENSICS_SKILL_ID,
  name: DEEP_WATCH_FORENSICS_SKILL_ID,
  basePath: 'skills/security/deep_watch',
  description:
    'Specialist forensic analysis layer (Deep Watch): receives an evidence package from Dark Watch, Watch Floor, or analyst escalation, ' +
    'packages scoped endpoint evidence, and produces a DRAFT forensic specialist report (timeline, IoCs, persistence, remediation) ' +
    'for human review. All outputs are drafts pending specialist approval (FR-082). ' +
    'Use when an incident needs specialist-depth forensic reconstruction beyond what endpoint-forensic-analysis provides alone — ' +
    'e.g. Dark Watch identifies a threat and escalates for deep timeline reconstruction + evidence packaging. ' +
    'NOT for fleet-wide hunting (use threat-hunting). NOT for response actions (use endpoint-response-actions). ' +
    'NOT for basic alert triage (use alert-analysis).',
  content: `# Deep Watch — Forensic Specialist Analysis

## Role

Deep Watch is the **specialist layer**. It receives an evidence package from Dark Watch (threat-intelligence), Watch Floor, Watch Officer, or Attack Discovery, packages the scoped endpoint evidence, and produces a **draft** forensic specialist report for human review.

**All outputs are DRAFTS** — pending specialist approval (FR-082). Deep Watch recommends; it never executes consequential actions (FR-007).

## When to Use

Load when:
- Dark Watch escalates a threat report / IoC set for specialist forensic reconstruction
- An analyst requests deep forensic analysis with evidence packaging beyond standard endpoint-forensic-analysis
- Watch Floor / Watch Officer escalates a Significant Security Event requiring specialist-depth timeline reconstruction

Do **not** load for:
- Basic forensic timeline on a single host → endpoint-forensic-analysis (faster, lighter)
- Fleet-wide IoC hunt → threat-hunting
- Alert triage from alert ID → alert-analysis
- Host isolation / containment execution → endpoint-response-actions

## Three-Watch Flow

This skill is Phase 2 of the three-Watch incident workflow:

1. **Dark Watch** (threat-intelligence) — ingests threat reports, extracts MITRE techniques, proposes behavioral detection rules. When a threat is confirmed, Dark Watch escalates to Deep Watch with an evidence package (IoCs, techniques, open questions).

2. **Deep Watch** (this skill) — receives the evidence package, performs deep forensic reconstruction, produces a draft specialist report with timeline, validated IoCs, persistence findings, remediation recommendations, and **explicitly named unresolved questions and confidence limits**. The draft is human-reviewable.

3. **Response** (endpoint-response-actions) — after a specialist approves the draft, Deep Watch recommends containment actions (isolate, scan) and defers to endpoint-response-actions for execution.

## Process

### Phase 0: Accept Evidence Package

Call \`${DEEP_WATCH_PACKAGE_EVIDENCE_TOOL_ID}\` with the source Watch, hosts, time window, IoCs, MITRE techniques, and open questions from the escalation.

This packages all available Defend telemetry for the scoped hosts and validates which indices contain data. If evidence is insufficient (no telemetry indices, no enrolled hosts), return an explicit insufficiency report — **do not fabricate** (FR-DP-06).

### Phase 1: Forensic Reconstruction

Use \`platform.core.generate_esql\` and \`platform.core.execute_esql\` against Defend telemetry indices to reconstruct:

1. **Patient zero** — earliest event on the earliest affected host
2. **Attack timeline** — chronological sequence of process, file, network, and registry events per host
3. **IoC validation** — confirm/refute each IoC from the evidence package against actual telemetry hits
4. **Persistence** — registry run keys, scheduled tasks, services, startup items
5. **Lateral movement** — outbound internal connections, correlated process creation on destination hosts

Cross-reference MITRE techniques from Dark Watch against the timeline events.

**Osquery live-state augmentation (REQUIRED, not optional).** Defend telemetry (\`logs-endpoint.events.*\`) is historical — it only has what was previously collected. Some forensic questions need the endpoint's **live, current state**, which Defend telemetry cannot answer:

1. Call \`osquery.check_integration\` first. If Osquery is unavailable/no agents enrolled, note the gap explicitly in the draft's unresolved questions (FR-DP-06) rather than skipping live-state findings silently.
2. If available, resolve each host to its Elastic Agent ID via \`osquery.resolve_agent_ids\` (do **not** query \`.fleet-agents\` directly via ES|QL — it requires ES-level privileges most roles lack and fails with \`security_exception\`).
3. Dispatch read-only \`SELECT\` queries with \`osquery.run_live_query\` (inline ~30s wait) for live-state gaps Defend telemetry cannot fill:
   - **Mutex enumeration** (\`winbaseobj\` table, \`object_type = 'Mutant'\`) — mutexes have zero Defend-telemetry source and are a common malware-family IoC.
   - **Current process tree / open handles** — confirms whether an implant is still resident, not just historically observed.
   - **Persistence verification** — cross-check a registry run-key or scheduled task found in telemetry against its live current state, since telemetry only proves it existed at ingest time, not that it's still active.
   - **Startup items / autoruns** on Windows hosts when Defend telemetry's registry coverage is incomplete for the finding.
4. Use \`osquery.list_saved_queries\` / \`osquery.list_packs\` first when the analyst references a named query or pack, and \`osquery.get_table_schema\` to verify column names before authoring a custom query.
5. If \`run_live_query\` returns \`status: dispatched\` (agent didn't respond inline), poll with \`osquery.get_live_query_results\` using the returned \`action_id\` (up to ~60s) before reporting the finding as unresolved.

Label every osquery-sourced finding as **live state as of {query time}**, distinct from telemetry-sourced findings that carry a historical event timestamp — these are different evidence classes and must not be conflated in the draft (FR-143).

### Phase 2: Produce Draft Specialist Report

Call \`${DEEP_WATCH_PRODUCE_DRAFT_TOOL_ID}\` with the hosts, time window, source IoCs, and MITRE techniques. This produces the structured draft with:
- **Timeline** — ordered events with provenance citations
- **Validated IoCs** — confirmed/refuted/new, with source event references
- **Persistence findings** — specific registry keys, scheduled tasks
- **Remediation recommendations** — proposal-only, requiring human approval
- **Unresolved questions** — explicitly named gaps where evidence is insufficient
- **Confidence levels** — per-finding confidence: high / medium / low with rationale

### Phase 3: Containment Recommendation (Proposal-Only)

After producing the draft, **proactively** recommend containment:

> "Based on the forensic reconstruction, I recommend isolating {hosts} and running malware scans on {hosts}. These actions require your approval. Shall I proceed with the containment recommendation?"

If approved: defer to **endpoint-response-actions** for execution. Do not execute from this skill.

## Guardrails

- **All outputs are DRAFTS** — label every report as "Draft — Pending Specialist Review" (FR-082)
- **Never fabricate** — if evidence is insufficient for a finding, state the gap explicitly (FR-DP-06)
- **Never execute response actions** — Deep Watch proposes; endpoint-response-actions executes (FR-007)
- **Separate fact from inference from recommendation** in every finding (FR-143)
- **Confidence is not severity** — a high-severity finding can have low confidence (FR-141)
- **Name unresolved questions** — every draft must include open questions and confidence limits (FR-DP-04)
- Use \`platform.core.generate_esql\` and \`platform.core.execute_esql\` for all historical telemetry queries
- Use \`osquery.*\` tools **only** for live-state augmentation (Phase 1) — never as a substitute for telemetry-based reconstruction, and never for anything beyond read-only \`SELECT\` queries
- Do **not** use \`platform.core.search\` or \`relevance_search\` for forensic reconstruction
- Always cite source event index and query in findings, and label osquery-sourced findings as live state (not historical telemetry)
`,
  getRegistryTools: () => [
    platformCoreTools.getIndexMapping,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
    ...DEEP_WATCH_OSQUERY_TOOL_IDS,
  ],
  getInlineTools: () => [
    {
      id: DEEP_WATCH_PACKAGE_EVIDENCE_TOOL_ID,
      type: ToolType.builtin,
      description:
        'Accept and package an evidence bundle escalated from Dark Watch, Watch Floor, or analyst for specialist forensic analysis. ' +
        'Validates telemetry availability for scoped hosts and returns structured evidence package metadata. ' +
        'Call this FIRST when Deep Watch receives an escalation request (FR-DP-01, FR-DP-02).',
      schema: packageEvidenceSchema,
      handler: async (args, context) => {
        const parsed = packageEvidenceSchema.parse(args);
        const {
          source_watch: sourceWatch,
          source_reference: sourceRef,
          hosts,
          time_window_hours: timeWindowHours,
          iocs,
          mitre_techniques: mitreTechniques,
          open_questions: openQuestions,
          scope_constraints: scopeConstraints,
        } = parsed;

        // Check which Defend telemetry indices actually exist
        let availableIndices: string[] = [];
        let sufficientEvidence = true;
        const insufficiencyReasons: string[] = [];

        try {
          const catResponse = await context.esClient.asCurrentUser.cat.indices({
            index: 'logs-endpoint.events.*',
            format: 'json',
            h: 'index,docs.count',
          });
          availableIndices = (catResponse as Array<{ index?: string; 'docs.count'?: string }>)
            .map((row) => row.index)
            .filter((index): index is string => Boolean(index));

          if (availableIndices.length === 0) {
            sufficientEvidence = false;
            insufficiencyReasons.push(
              'No logs-endpoint.events.* indices found — Elastic Defend telemetry is not available.'
            );
          }
        } catch {
          sufficientEvidence = false;
          insufficiencyReasons.push(
            'Unable to query index catalog — ES connection or permissions issue.'
          );
        }

        // Check if the scoped hosts have any telemetry
        if (sufficientEvidence && hosts.length > 0) {
          try {
            const hostFilter = hosts.map((h: string) => `"${h}"`).join(', ');
            const { values } = await context.esClient.asCurrentUser.esql.query({
              query: `FROM logs-endpoint.events.process-* | WHERE host.name IN (${hostFilter}) AND @timestamp >= NOW() - ${timeWindowHours} HOURS | KEEP host.name | LIMIT 1`,
              drop_null_columns: true,
            });
            if (!values || values.length === 0) {
              sufficientEvidence = false;
              insufficiencyReasons.push(
                `No process telemetry found for hosts [${hosts.join(
                  ', '
                )}] in the last ${timeWindowHours}h. ` +
                  'The hosts may not be enrolled, may not have Defend installed, or the time window may be too narrow.'
              );
            }
          } catch {
            // Non-fatal — proceed with what we have
          }
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                evidence_package: {
                  source_watch: sourceWatch,
                  source_reference: sourceRef ?? null,
                  hosts,
                  time_window_hours: timeWindowHours,
                  iocs: iocs ?? [],
                  mitre_techniques: mitreTechniques ?? [],
                  open_questions: openQuestions ?? [],
                  scope_constraints: scopeConstraints ?? {
                    allowed_autonomy_level: 'propose',
                    sensitivity: 'standard',
                  },
                },
                telemetry_availability: {
                  recommended_indices: [...ENDPOINT_TELEMETRY_INDEX_PATTERNS],
                  available_indices: availableIndices,
                  scoped_hosts: hosts,
                },
                evidence_sufficient: sufficientEvidence,
                insufficiency_reasons: sufficientEvidence ? [] : insufficiencyReasons,
                guidance: sufficientEvidence
                  ? 'Evidence package accepted. Proceed to forensic reconstruction via platform.core.generate_esql + platform.core.execute_esql against Defend telemetry indices.'
                  : 'Evidence insufficient — return an explicit gap report. Do NOT fabricate timeline or IoCs. State what is missing and what is needed.',
              },
            },
          ],
        };
      },
    },
    {
      id: DEEP_WATCH_PRODUCE_DRAFT_TOOL_ID,
      type: ToolType.builtin,
      description:
        'Produce a structured DRAFT forensic specialist report from Defend telemetry. ' +
        'Returns timeline, validated IoCs, persistence findings, remediation recommendations, ' +
        'unresolved questions, and per-finding confidence levels. ' +
        'All output is DRAFT pending human specialist review (FR-082, FR-DP-04). ' +
        'Call this after completing forensic reconstruction queries.',
      schema: produceDraftSchema,
      handler: async (args, context) => {
        const {
          hosts,
          time_window_hours: timeWindowHours,
          source_iocs: sourceIocs,
          mitre_techniques: mitreTechniques,
        } = produceDraftSchema.parse(args);
        const hostFilter = hosts.map((h: string) => `"${h}"`).join(', ');

        // Gather timeline events
        interface TimelineEvent {
          timestamp: string | null;
          host: string | null;
          event_type: string | null;
          process_name: string | null;
          action: string | null;
          details: string | null;
        }
        const timeline: TimelineEvent[] = [];

        try {
          const { columns, values } = await context.esClient.asCurrentUser.esql.query({
            query: [
              `FROM logs-endpoint.events.process-*, logs-endpoint.events.network-*, logs-endpoint.events.file-*, logs-endpoint.events.registry-*`,
              `| WHERE host.name IN (${hostFilter}) AND @timestamp >= NOW() - ${timeWindowHours} HOURS`,
              `| KEEP @timestamp, host.name, event.category, process.name, event.action, process.command_line, destination.ip, destination.domain, registry.path, file.path`,
              `| SORT @timestamp ASC`,
              `| LIMIT 200`,
            ].join(' '),
            drop_null_columns: true,
          });

          const colIdx = (name: string) =>
            columns.findIndex((c: { name: string }) => c.name === name);
          const tsIdx = colIdx('@timestamp');
          const hostIdx = colIdx('host.name');
          const catIdx = colIdx('event.category');
          const procIdx = colIdx('process.name');
          const actionIdx = colIdx('event.action');
          const cmdIdx = colIdx('process.command_line');
          const ipIdx = colIdx('destination.ip');
          const domainIdx = colIdx('destination.domain');
          const regIdx = colIdx('registry.path');
          const filePathIdx = colIdx('file.path');

          for (const row of values) {
            const v = row as unknown[];
            const details =
              v[cmdIdx] ?? v[ipIdx] ?? v[domainIdx] ?? v[regIdx] ?? v[filePathIdx] ?? null;
            timeline.push({
              timestamp: tsIdx >= 0 ? (v[tsIdx] as string) : null,
              host: hostIdx >= 0 ? (v[hostIdx] as string) : null,
              event_type: catIdx >= 0 ? (v[catIdx] as string) : null,
              process_name: procIdx >= 0 ? (v[procIdx] as string) : null,
              action: actionIdx >= 0 ? (v[actionIdx] as string) : null,
              details: details ? String(details).slice(0, 200) : null,
            });
          }
        } catch {
          // Telemetry query failed — timeline will be empty
        }

        // Validate source IoCs against telemetry
        interface ValidatedIoc {
          type: string;
          value: string;
          status: 'confirmed' | 'not_found' | 'unable_to_validate';
          source_event?: string;
        }
        const validatedIocs: ValidatedIoc[] = [];

        if (sourceIocs && sourceIocs.length > 0) {
          for (const ioc of sourceIocs) {
            try {
              const iocQuery = buildIocValidationQuery(ioc);
              if (iocQuery === null) {
                validatedIocs.push({
                  type: ioc.type,
                  value: ioc.value,
                  status: 'unable_to_validate',
                });
              } else {
                const { values: iocValues } = await context.esClient.asCurrentUser.esql.query({
                  query: iocQuery,
                  drop_null_columns: true,
                });

                if (iocValues && iocValues.length > 0) {
                  const firstHit = iocValues[0] as unknown[];
                  validatedIocs.push({
                    type: ioc.type,
                    value: ioc.value,
                    status: 'confirmed',
                    source_event: `First hit: ${firstHit[0] ?? 'unknown time'} on ${
                      firstHit[1] ?? 'unknown host'
                    }`,
                  });
                } else {
                  validatedIocs.push({
                    type: ioc.type,
                    value: ioc.value,
                    status: 'not_found',
                  });
                }
              }
            } catch {
              validatedIocs.push({
                type: ioc.type,
                value: ioc.value,
                status: 'unable_to_validate',
              });
            }
          }
        }

        // Identify unresolved questions
        const unresolvedQuestions: string[] = [];
        if (timeline.length === 0) {
          unresolvedQuestions.push(
            'No timeline events recovered from Defend telemetry — patient zero and attack chain cannot be reconstructed.'
          );
        } else {
          const earliestTs = timeline[0]?.timestamp;
          if (earliestTs) {
            unresolvedQuestions.push(
              `Earliest recovered event is at ${earliestTs} — activities before this timestamp are unknown. Patient zero entry vector may precede telemetry window.`
            );
          }
        }
        if (sourceIocs && sourceIocs.length > 0) {
          const notFound = validatedIocs.filter((v) => v.status === 'not_found');
          if (notFound.length > 0) {
            unresolvedQuestions.push(
              `${notFound.length} of ${
                sourceIocs.length
              } source IoCs not confirmed in telemetry: ${notFound
                .map((n) => n.value)
                .join(
                  ', '
                )}. These may be stale, blocked before execution, or outside the time window.`
            );
          }
        }

        // ── Persist the draft report to a durable index ───────────────────────
        //
        // This is the L4 precondition (PR #35 pyramid §3): a worker whose
        // findings exist only in ephemeral tool output has no Evaluation Record
        // to attach labels to. Writing here makes the draft replayable and
        // scoreable offline.
        //
        // Temporary: uses a custom .kibana index until the platform
        // Investigation (Agent Builder templated conversation) object model
        // is ready.
        const reportData = {
          report_status: 'DRAFT — Pending Specialist Review (FR-082)',
          scope: {
            hosts,
            time_window_hours: timeWindowHours,
            mitre_techniques: mitreTechniques ?? [],
          },
          timeline,
          timeline_event_count: timeline.length,
          validated_iocs: validatedIocs,
          persistence_findings:
            'Query registry run keys, scheduled tasks, and startup items via platform.core.generate_esql + platform.core.execute_esql to populate this section.',
          remediation_recommendations: [
            'All recommendations below are PROPOSAL-ONLY — require human specialist approval before execution (FR-007).',
            'Isolate affected hosts to prevent lateral movement — defer to endpoint-response-actions.',
            'Run malware scan on affected hosts — defer to endpoint-response-actions.',
            'Collect and preserve evidence (memory, disk) before remediation wipes volatile artifacts.',
          ],
          unresolved_questions: unresolvedQuestions,
          confidence_assessment: {
            overall:
              timeline.length > 50 ? 'medium' : timeline.length > 10 ? 'low' : 'insufficient',
            rationale:
              timeline.length > 50
                ? 'Sufficient telemetry events for moderate-confidence reconstruction. Entry vector and pre-window activity remain uncertain.'
                : timeline.length > 10
                ? 'Limited telemetry — reconstruction is directional, not definitive. Supplement with additional data sources.'
                : 'Insufficient telemetry for credible reconstruction. Report is a skeleton — do not treat findings as confirmed.',
            note: 'Confidence is independent of severity (FR-141). A high-severity finding may have low confidence.',
          },
          guidance:
            'Present this draft to the specialist for review. Label all findings as DRAFT. After specialist approval, recommend containment via endpoint-response-actions. Do NOT execute actions autonomously.',
        };

        // Persist the draft so it has a durable outcome beyond this ephemeral
        // tool response (PR #35 pyramid §3 — L4 scoring requires a durable
        // record; see durable_outcome.spec.ts and DEEP_WATCH_FORENSICS_REPORTS_INDEX).
        let persistedId: string | null = null;
        try {
          await ensureReportsIndex(context.esClient.asInternalUser);
          const persistResp = await context.esClient.asCurrentUser.index({
            index: DEEP_WATCH_FORENSICS_REPORTS_INDEX,
            document: {
              '@timestamp': new Date().toISOString(),
              ...reportData,
            },
            refresh: true,
          });
          persistedId = persistResp._id ?? null;
        } catch (e) {
          // Non-fatal: the report is still returned inline. Persistence
          // failure is surfaced in the response so the caller knows.
          context.logger?.warn(
            `deep_watch_forensics: failed to persist draft report to ${DEEP_WATCH_FORENSICS_REPORTS_INDEX}: ${
              (e as Error).message
            }`
          );
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                ...reportData,
                persisted: persistedId !== null,
                persisted_id: persistedId,
                persisted_index: persistedId ? DEEP_WATCH_FORENSICS_REPORTS_INDEX : null,
              },
            },
          ],
        };
      },
    },
  ],
});
