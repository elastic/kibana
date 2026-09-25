/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Corpus → persisted-docs → workflow-ids bridge.
 *
 * The FP/TP analysis workflow (`system-security-attack-discovery-fp-tp-analysis`)
 * takes ONLY `attack_discovery_id` + `investigation_id` and loads all evidence
 * itself from the persisted AD document (`kibana.alert.attack_discovery.*`
 * fields) and the Investigation conversation. So per corpus case, this module:
 *
 *   1. Seeds a real persisted AD document via the dev-only data generator route
 *      `POST /internal/elastic_assistant/data_generator/attack_discoveries/_create`,
 *      which writes through the alerting framework into
 *      `.adhoc.alerts-security.attack.discovery.alerts-<space>` (the exact index
 *      the workflow searches by id) and returns the persisted docs in `data`.
 *
 *      Corpus→AD-field mapping (payload is GUIDE incident-level evidence):
 *        title                → `GUIDE <IncidentId>: <first DetectorName/category summary>` (plain text)
 *        summaryMarkdown      → gold-label-free rendering: categories, techniques, action groups, evidence row count.
 *                               The gold label and gold_rationale are deliberately NOT copied in —
 *                               the workflow must classify from evidence, not from the answer.
 *        detailsMarkdown      → bulleted markdown over DetectorIds/Names, MitreTechniques, Category,
 *                               SuspicionLevel, ActionGrouped/ActionGranular, Devices, Accounts,
 *                               EntityTypes, EvidenceRoles.
 *        entitySummaryMarkdown→ `Host {{ host.name X }} User {{ user.name Y }}` from the first
 *                               Devices/Accounts entries, using AD's special pivot syntax.
 *        mitreAttackTactics   → the Category entries (GUIDE categories are ATT&CK tactic names).
 *        alertIds             → synthetic ids derived from case_id (the payload has no real alert ids).
 *        timestamp            → payload Timestamp.
 *
 *   2. Opens an Investigation conversation via
 *      `POST /api/agent_builder/conversations` with an explicit `conversation_id`,
 *      derived from the persisted AD document id exactly like the review workflow's
 *      `resolve_investigation_id` step (SHA-hex slice forced to UUIDv8 nibbles).
 *      This is a metadata-only create — no message is sent, so the Investigation
 *      agent is never woken, mirroring the `ai.conversation.metadata.read` contract
 *      the analysis workflow relies on.
 *
 *   3. POSTs the workflow run with `{ attack_discovery_id, investigation_id }` and
 *      polls to a terminal status.
 *
 * Honest degradation: any seeding failure is returned as `seedingError` with
 * `executionStatus: 'failed'` — the case stays graded (no verdict ⇒ no-verdict)
 * and is never skipped.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import {
  TerminalExecutionStatuses,
  type ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { FP_TP_ANALYSIS_WORKFLOW_ID, WORKFLOWS_API_VERSION } from './constants';

/** The `ai.agent` step whose structured output we grade. */
const AGENT_STEP_TYPE = 'ai.agent';
/** stepId fallbacks for execution records that omit `stepType`. */
const AGENT_STEP_ID_FALLBACKS = ['runAgent_step', 'onechat_runAgent_step'];

const isAgentStep = (step: WorkflowStepExecutionDto): boolean =>
  step.stepType === AGENT_STEP_TYPE ||
  (step.stepType === undefined && AGENT_STEP_ID_FALLBACKS.includes(step.stepId));

/** Verdict as the workflow's `ai.agent` step is schema-constrained to return it. */
export interface WorkflowVerdict {
  id?: string;
  verdict?: string;
  label?: string;
  classification?: string;
  summary_markdown?: string;
  confidence?: number;
  rationale_markdown?: string;
}

/** Runtime alias so readAgentVerdict can return a bare-string structured verdict too. */
export type AgentVerdict = string | WorkflowVerdict;

/** The workflow output shape of the fp-tp analysis workflow. */
interface WorkflowOutput {
  verdict?: string;
  summary_markdown?: string;
  rationale_markdown?: string;
  analysis_execution_id?: string;
  attack_discovery_id?: string;
}

interface StructuredOutput {
  verdict?: WorkflowVerdict;
  verdicts?: WorkflowVerdict[];
}

/**
 * Task output graded by the suite's evaluators. `verdict` is undefined when
 * the workflow failed or no agent verdict was produced — evaluators treat
 * that as incorrect/non-conformant rather than throwing.
 */
export interface AttackDiscoveryTaskOutput {
  verdict?: AgentVerdict;
  workflowOutput?: WorkflowOutput;
  executionId: string;
  executionStatus: ExecutionStatus;
  traceId?: string;
  /** Set when seeding (AD doc or investigation) failed; the case grades as no-verdict. */
  seedingError?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

/**
 * Reads the workflow output. On the live stack the top-level `execution.output`
 * is null — the workflow's result lives on the terminal `workflow.output` step
 * (`emit_result`, stepType `workflow.output`), which the executions API returns
 * with `includeOutput: true`. Fall back to that step when the record omits it.
 */
export const readWorkflowOutput = (execution: WorkflowExecutionDto): WorkflowOutput | undefined => {
  const direct = (execution as { output?: WorkflowOutput | null }).output;
  if (direct) return direct;
  const outputStep = (execution.stepExecutions ?? []).find(
    (step: WorkflowStepExecutionDto) => step.stepType === 'workflow.output' && step.output != null
  );
  return outputStep == null
    ? undefined
    : (outputStep.output as unknown as WorkflowOutput | undefined);
};

/**
 * Scans the agent step's execution records for a structured_output verdict.
 * Each step yields multiple records (an enter record whose `output` is null,
 * plus the record carrying the result), so we scan every agent-step record —
 * enter records are skipped naturally by the null-output guard. A missing
 * verdict is reported as `undefined`, not thrown.
 */
export const readAgentVerdict = (
  stepExecutions: WorkflowStepExecutionDto[]
): WorkflowVerdict | string | undefined => {
  for (const step of stepExecutions.filter(isAgentStep)) {
    const output = step.output as { structured_output?: StructuredOutput } | null | undefined;
    const structured = output?.structured_output;
    const verdict = structured?.verdict ?? structured?.verdicts?.[0];
    if (verdict) {
      return verdict;
    }
  }
  return undefined;
};

/**
 * Normalizes a verdict to a canonical label from the workflow's enum
 * (`verdict` field at either the workflow-output or structured-output level,
 * with the agent's `label`/`classification` aliases kept for resilience).
 */
export const normalizeVerdictLabel = (
  task: Pick<AttackDiscoveryTaskOutput, 'verdict' | 'workflowOutput'>
): string | undefined =>
  task.workflowOutput?.verdict ??
  (typeof task.verdict === 'string'
    ? task.verdict
    : task.verdict?.verdict ?? task.verdict?.label ?? task.verdict?.classification);
// ---------------------------------------------------------------------------
// Investigation-id derivation (mirrors attack_discovery_review.yaml's
// resolve_investigation_id Liquid template: an 8-4-4-4-12 slice of the AD
// document id with the version/variant nibbles forced to `8` — UUIDv8).
// ---------------------------------------------------------------------------

/**
 * Derives the Investigation conversation id from a persisted attack discovery
 * document id, exactly as the review workflow does. Returns null when the id
 * is not a plain hex SHA slice (at least 30 hex chars), in which case callers
 * generate a random UUIDv4-style conversation id instead — the workflow's
 * `load_investigation` metadata read only requires the conversation to exist.
 */
export const deriveInvestigationId = (attackDiscoveryId: string): string | null => {
  if (!/^[0-9a-f]{30,}$/i.test(attackDiscoveryId)) {
    return null;
  }
  const h = attackDiscoveryId.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(12, 15)}-8${h.slice(15, 18)}-${h.slice(
    18,
    30
  )}`;
};

/** Fallback random UUID (v4 shape) when the AD id is not hex-derivable. */
const randomUuid = (): string => {
  const hex = () =>
    Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-8${hex().slice(1)}-${hex()}${hex()}${hex()}`;
};

// ---------------------------------------------------------------------------
// Corpus payload → persisted AD document mapping
// ---------------------------------------------------------------------------

/** Persisted attack discovery document as returned by the data generator route. */
export interface PersistedAttackDiscovery {
  id: string;
  title?: string;
  summaryMarkdown?: string;
  detailsMarkdown?: string;
  entitySummaryMarkdown?: string;
  alertIds?: string[];
  timestamp?: string;
}

/** Corpus case payload fields this bridge renders into the seeded AD document. */
interface CorpusEvidence {
  IncidentId?: string | number;
  Timestamp?: string;
  DetectorId?: string[];
  DetectorNames?: string[];
  MitreTechniques?: string[];
  Category?: string[];
  EvidenceRowCount?: number;
  Devices?: string[];
  Accounts?: string[];
  ActionGrouped?: string[];
  ActionGranular?: string[];
  SuspicionLevel?: string[];
  EntityTypes?: string[];
  EvidenceRoles?: string[];
}

const listOf = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

const joinList = (items: string[], empty = 'none recorded'): string =>
  items.length > 0 ? items.join(', ') : empty;

const truncate = (s: string, max = 200): string => (s.length > max ? `${s.slice(0, max)}…` : s);

// ---------------------------------------------------------------------------
// Per-corpus payload renderers. Corpus payload shapes VARY per corpus family;
// each corpus maps its own evidence onto the canonical AD document fields.
// ---------------------------------------------------------------------------

interface AdDocumentFields {
  title: string;
  summaryMarkdown: string;
  detailsMarkdown: string;
  entitySummaryMarkdown?: string;
  mitreAttackTactics: string[];
  alertIds: string[];
  timestamp?: string;
}

/** Common alertId / timestamp helpers shared by the renderers. */
const alertIdsFor = (caseId: string): string[] => [`case-${caseId}-alert-1`];

/**
 * guide-sanity: flat GUIDE incident-level fields (Category, DetectorNames,
 * MitreTechniques, Devices, Accounts, ActionGrouped, …). Categories are
 * ATT&CK tactic names and map to mitreAttackTactics.
 */
const renderGuidePayload = (caseId: string, ev: CorpusEvidence): AdDocumentFields => {
  const categories = listOf(ev.Category);
  const detectors = listOf(ev.DetectorNames);
  const techniques = listOf(ev.MitreTechniques);
  const actions = listOf(ev.ActionGrouped);
  const granular = listOf(ev.ActionGranular);
  const devices = listOf(ev.Devices);
  const accounts = listOf(ev.Accounts);

  const title = `GUIDE ${ev.IncidentId ?? caseId}: ${
    categories[0] ?? detectors[0] ?? 'suspicious activity'
  } incident`;

  const summaryMarkdown =
    `Incident ${ev.IncidentId ?? caseId} with ${ev.EvidenceRowCount ?? 'unknown'} evidence rows ` +
    `spanning ${categories.length} ATT&CK categor${categories.length === 1 ? 'y' : 'ies'} ` +
    `(${joinList(categories)}) and ${techniques.length} recorded technique signature(s). ` +
    `Response actions considered: ${joinList(actions)}.`;

  const detailLines = [
    `- Detector IDs: ${joinList(listOf(ev.DetectorId))}`,
    `- Detector names: ${joinList(detectors)}`,
    `- MITRE technique signatures: ${joinList(techniques)}`,
    `- Categories: ${joinList(categories)}`,
    `- Suspicion levels: ${joinList(listOf(ev.SuspicionLevel))}`,
    `- Grouped response actions: ${joinList(actions)}`,
    `- Granular response actions: ${joinList(granular)}`,
    `- Impacted devices: ${joinList(devices)}`,
    `- Impacted accounts: ${joinList(accounts)}`,
    `- Entity types: ${joinList(listOf(ev.EntityTypes))}`,
    `- Evidence roles: ${joinList(listOf(ev.EvidenceRoles))}`,
    `- Evidence row count: ${String(ev.EvidenceRowCount ?? 'unknown')}`,
  ];
  const detailsMarkdown = `Evidence rendered from incident ${
    ev.IncidentId ?? caseId
  }:\n\n${detailLines.join('\n')}`;

  const entitySummaryMarkdown =
    devices.length > 0 || accounts.length > 0
      ? `Host {{ host.name ${devices[0] ?? 'unknown'} }} User {{ user.name ${
          accounts[0] ?? 'unknown'
        } }}`
      : undefined;

  return {
    title,
    summaryMarkdown,
    detailsMarkdown,
    entitySummaryMarkdown,
    // GUIDE categories ARE ATT&CK tactic names (CredentialAccess, LateralMovement, ...).
    mitreAttackTactics: categories,
    alertIds: alertIdsFor(caseId),
    timestamp: typeof ev.Timestamp === 'string' ? ev.Timestamp : undefined,
  };
};

/** A single ECS-shaped event from the chain corpora's `events` list. */
interface ChainEvent {
  '@timestamp'?: string;
  message?: string;
  event?: { category?: string | string[]; action?: string; sequence?: number };
  host?: { name?: string };
  user?: { name?: string; domain?: string };
  process?: { name?: string; command_line?: string; pid?: number };
  destination?: { ip?: string; domain?: string; port?: number };
  source?: { ip?: string };
}

const eventToLine = (e: ChainEvent): string => {
  const parts: string[] = [];
  if (e['@timestamp']) parts.push(e['@timestamp']);
  if (e.host?.name) parts.push(`host ${e.host.name}`);
  if (e.user?.name)
    parts.push(`user ${e.user.domain ? `${e.user.domain}\\${e.user.name}` : e.user.name}`);
  if (e.process?.name)
    parts.push(`process ${e.process.name}${e.process.pid ? ` (pid ${e.process.pid})` : ''}`);
  if (e.process?.command_line) parts.push(`command_line ${truncate(e.process.command_line)}`);
  if (e.destination?.ip) parts.push(`dst ${e.destination.ip}`);
  if (e.destination?.domain) parts.push(`dst domain ${e.destination.domain}`);
  if (e.destination?.port) parts.push(`port ${e.destination.port}`);
  if (e.source?.ip) parts.push(`src ${e.source.ip}`);
  if (e.event?.action) parts.push(`action ${e.event.action}`);
  if (e.message) parts.push(truncate(e.message, 160));
  return parts.length > 0 ? `- ${parts.join(' | ')}` : '- (no extractable fields)';
};

const chainEventLines = (events: unknown): string[] =>
  (Array.isArray(events) ? events : []).slice(0, 40).map(eventToLine);

const chainEntitySummary = (events: ChainEvent[]): string | undefined => {
  const host = events.find((e) => e.host?.name)?.host?.name;
  const user = events.find((e) => e.user?.name)?.user?.name;
  if (!host && !user) {
    return undefined;
  }
  return `Host {{ host.name ${host ?? 'unknown'} }} User {{ user.name ${user ?? 'unknown'} }}`;
};

const chainTimestamp = (events: ChainEvent[]): string | undefined =>
  events.find((e) => typeof e['@timestamp'] === 'string')?.['@timestamp'];

/** Tactic guess from event categories (elastic category → ATT&CK tactic-ish label). */
const tacticsFromEvents = (events: ChainEvent[]): string[] => {
  const tactics = new Set<string>();
  for (const e of events) {
    const cats = Array.isArray(e.event?.category) ? e.event.category : [e.event?.category];
    for (const c of cats) {
      if (typeof c === 'string' && c) {
        tactics.add(c);
      }
    }
  }
  return [...tactics];
};

/**
 * tp-chains / adversarial-twins / perturbations: `{ attack_chain, events, … }`
 * where `events` is a list of ECS-shaped docs replaying one attack chain.
 * Mutation/perturbation/omission metadata is deliberately NOT rendered — the
 * workflow must judge the replayed evidence alone.
 */
const renderChainPayload = (
  caseId: string,
  payload: {
    attack_chain?: string;
    events?: unknown;
    documented_stages?: unknown;
    omissions?: unknown;
    variant?: unknown;
    mutation?: unknown;
    perturbation_rule?: unknown;
  }
): AdDocumentFields => {
  const events = (Array.isArray(payload.events) ? payload.events : []) as ChainEvent[];
  const chain = typeof payload.attack_chain === 'string' ? payload.attack_chain : caseId;

  const title = `Attack chain ${chain}: ${events.length} replayed event(s)`;
  const summaryMarkdown =
    `Replay of attack chain '${chain}' consisting of ${events.length} sequenced event(s). ` +
    `Review the evidence timeline and classify the chain as a true positive or false positive ` +
    `based only on the events rendered below.`;
  const detailsMarkdown = `Evidence rendered from attack chain ${chain}:\n\n${chainEventLines(
    events
  ).join('\n')}`;

  return {
    title,
    summaryMarkdown,
    detailsMarkdown,
    entitySummaryMarkdown: chainEntitySummary(events),
    mitreAttackTactics: tacticsFromEvents(events),
    alertIds: alertIdsFor(caseId),
    timestamp: chainTimestamp(events),
  };
};

/** BOTSv3 rule match event from `matched_events` (raw summary JSON string). */
interface MatchedEvent {
  timestamp?: string;
  host?: string;
  sourcetype?: string;
  summary?: string;
  es_index?: string;
  es_id?: string;
}

/**
 * botsv3-fp-alerts: `{ rule_name, rule_id, language, match_kind, matched_events, severity }`
 * — a detection rule plus the benign events that matched it (false positives).
 */
const renderBotsv3FpPayload = (
  caseId: string,
  payload: {
    rule_name?: string;
    rule_id?: string;
    language?: string;
    match_kind?: string;
    severity?: string;
    matched_events?: unknown;
  }
): AdDocumentFields => {
  const matches = (
    Array.isArray(payload.matched_events) ? payload.matched_events : []
  ) as MatchedEvent[];
  const ruleName = typeof payload.rule_name === 'string' ? payload.rule_name : 'unknown rule';

  const title = `Rule match: ${ruleName} (${matches.length} matched event(s))`;
  const summaryMarkdown =
    `Detection rule '${ruleName}' (id ${payload.rule_id ?? 'unknown'}, language ` +
    `${payload.language ?? 'unknown'}, match kind ${payload.match_kind ?? 'unknown'}) matched ` +
    `${matches.length} event(s). Classify whether the match is a true or false positive based ` +
    `only on the matched events.`;
  const detailLines = matches.slice(0, 20).map((m) => {
    const parts = [m.timestamp, m.host ? `host ${m.host}` : undefined, m.sourcetype]
      .filter(Boolean)
      .join(' | ');
    return `- ${parts || 'match'}: ${m.summary ? truncate(m.summary, 200) : '(no summary)'}`;
  });
  const detailsMarkdown = `Matched events for rule '${ruleName}':\n\n${
    detailLines.length > 0 ? detailLines.join('\n') : '- (no matched events)'
  }`;

  const hosts = matches.map((m) => m.host).filter((h): h is string => typeof h === 'string');
  const entitySummaryMarkdown =
    hosts.length > 0 ? `Host {{ host.name ${hosts[0]} }} User {{ user.name unknown }}` : undefined;

  return {
    title,
    summaryMarkdown,
    detailsMarkdown,
    entitySummaryMarkdown,
    mitreAttackTactics: [],
    alertIds: alertIdsFor(caseId),
    timestamp: matches.find((m) => typeof m.timestamp === 'string')?.timestamp,
  };
};

/**
 * cloud-fp-synthetic: a single flattened ECS cloud doc
 * (`azure.activitylogs` snapshot ops etc., `labels.benign: true`).
 */
/** Flattens the single-ECS cloud doc into scalar display fields. */
const flattenCloudFields = (p: Record<string, unknown>) => {
  const timestamp = typeof p['@timestamp'] === 'string' ? p['@timestamp'] : undefined;
  const event = (p.event ?? {}) as { action?: string; dataset?: string; outcome?: string };
  const user = (p.user ?? {}) as { name?: string; id?: string };
  const cloud = (p.cloud ?? {}) as { provider?: string; 'account.id'?: string };
  const azure = (p.azure ?? {}) as {
    activitylogs?: { operation_name?: string };
    resource_id?: string;
  };
  const source = (p.source ?? {}) as { ip?: string };
  return {
    timestamp,
    action: azure.activitylogs?.operation_name ?? event.action ?? 'unknown cloud operation',
    outcome: event.outcome ?? 'unknown',
    dataset: event.dataset ?? 'unknown',
    provider: cloud.provider ?? 'unknown',
    accountId: cloud['account.id'] ?? 'unknown',
    resourceId: azure.resource_id ?? 'unknown',
    userName: user.name ?? 'unknown',
    userId: user.id ?? 'unknown',
    sourceIp: source.ip ?? 'unknown',
    eventCode: p.event_code ?? 'unknown',
  };
};

const renderCloudFpPayload = (caseId: string, p: Record<string, unknown>): AdDocumentFields => {
  const f = flattenCloudFields(p);

  const title = `Cloud activity: ${f.action}`;
  const summaryMarkdown =
    `Cloud ${f.provider} activity in dataset ${f.dataset}: ` +
    `'${f.action}' (outcome ${f.outcome}) by user ${f.userName} ` +
    `on account ${f.accountId}. Classify whether this activity is a true ` +
    `or false positive based only on the event fields.`;
  const lines: string[] = [
    `- Action: ${f.action}`,
    `- Event code: ${String(f.eventCode)}`,
    `- Outcome: ${f.outcome}`,
    `- Dataset: ${f.dataset}`,
    `- Cloud provider: ${f.provider}`,
    `- Cloud account: ${f.accountId}`,
    `- Resource: ${f.resourceId}`,
    `- User: ${f.userName} (${f.userId})`,
    `- Source IP: ${f.sourceIp}`,
    `- Timestamp: ${f.timestamp ?? 'unknown'}`,
  ];
  const detailsMarkdown = `Evidence rendered from cloud event ${caseId}:\n\n${lines.join('\n')}`;

  const entitySummaryMarkdown = `Host {{ host.name cloud }} User {{ user.name ${f.userName} }}`;

  return {
    title,
    summaryMarkdown,
    detailsMarkdown,
    entitySummaryMarkdown,
    mitreAttackTactics: [],
    alertIds: alertIdsFor(caseId),
    timestamp: f.timestamp,
  };
};

/**
 * botsv3-benign-day: window metadata only — NO events (`{ window_start_utc,
 * window_end_utc, dataset, capture_day, exclusion_spec }`). Rendered as an AD
 * document whose evidence is an explicitly empty quiet window.
 */
const renderBenignWindowPayload = (
  caseId: string,
  payload: {
    window_start_utc?: string;
    window_end_utc?: string;
    dataset?: string;
    capture_day?: string;
    exclusion_spec?: string;
  }
): AdDocumentFields => {
  const start = payload.window_start_utc ?? 'unknown';
  const end = payload.window_end_utc ?? 'unknown';

  return {
    title: `Benign window ${start} → ${end}`,
    summaryMarkdown:
      `Capture window ${start} to ${end} from dataset ${payload.dataset ?? 'unknown'} ` +
      `(day ${payload.capture_day ?? 'unknown'}) recorded no suspicious activity. Classify ` +
      `this window as a true or false positive based only on the (empty) evidence.`,
    detailsMarkdown: `Evidence rendered from benign window ${caseId}:\n\n${[
      `- Window start: ${start}`,
      `- Window end: ${end}`,
      `- Dataset: ${String(payload.dataset ?? 'unknown')}`,
      `- Capture day: ${String(payload.capture_day ?? 'unknown')}`,
      `- Exclusion spec: ${String(payload.exclusion_spec ?? 'unknown')}`,
      '- Events: none recorded (the window is expected to be benign)',
    ].join('\n')}`,
    entitySummaryMarkdown: undefined,
    mitreAttackTactics: [],
    alertIds: alertIdsFor(caseId),
    timestamp: typeof payload.window_start_utc === 'string' ? payload.window_start_utc : undefined,
  };
};

const hasGuideShape = (payload: Record<string, unknown>): boolean =>
  ['Category', 'DetectorNames', 'IncidentId', 'MitreTechniques'].some((k) => k in payload);

/**
 * Builds the CreateAttackDiscoveryAlertsParams' `attackDiscoveries` entry from
 * a corpus case, dispatching on the corpus payload SHAPE (payloads vary per
 * corpus family): flat GUIDE fields → GUIDE renderer; `events` list → chain
 * renderer; `matched_events` list → BOTSv3 rule-match renderer; single ECS
 * cloud doc → cloud renderer; window metadata only → benign-window renderer.
 * The gold label / gold_rationale are NEVER rendered into the document — the
 * workflow must classify from evidence alone.
 */
export const buildAttackDiscoveryFromPayload = (
  caseId: string,
  payload: Record<string, unknown>
): AdDocumentFields => {
  const p = payload ?? {};
  if (Object.keys(p).length === 0) {
    // Degenerate/empty payload (real corpora never ship one): render the GUIDE
    // defaults rather than throwing, so a blank case still seeds.
    return renderGuidePayload(caseId, p as CorpusEvidence);
  }
  if (hasGuideShape(p)) {
    return renderGuidePayload(caseId, p as CorpusEvidence);
  }
  if (Array.isArray(p.events)) {
    return renderChainPayload(caseId, p);
  }
  if (Array.isArray(p.matched_events)) {
    return renderBotsv3FpPayload(caseId, p);
  }
  if ('@timestamp' in p || 'azure' in p || 'labels.benign' in p) {
    return renderCloudFpPayload(caseId, p);
  }
  if ('window_start_utc' in p || 'capture_day' in p) {
    return renderBenignWindowPayload(caseId, p);
  }
  throw new Error(
    `case ${caseId}: payload matches no known corpus shape ` +
      `(keys: ${Object.keys(p).slice(0, 12).join(', ')})`
  );
};

// ---------------------------------------------------------------------------
// Seeding: persisted AD doc + investigation conversation
// ---------------------------------------------------------------------------

export interface SeedingClients {
  fetch: HttpHandler;
  log: ToolingLog;
}

/**
 * Seeds one persisted AD document through the dev-only data generator route and
 * returns the persisted document (its `id` is what the workflow searches by).
 *
 * The route runs a real alerting rule (`runSoon`) that persists via the alerting
 * framework, polls for the documents, and backdates timestamps — so the response
 * `data` entries carry the final persisted document ids in
 * `.adhoc.alerts-security.attack.discovery.alerts-<space>`.
 */
export const seedAttackDiscovery = async (
  { fetch, log }: SeedingClients,
  doc: ReturnType<typeof buildAttackDiscoveryFromPayload>,
  caseId: string
): Promise<PersistedAttackDiscovery> => {
  const response = (await fetch(
    '/internal/elastic_assistant/data_generator/attack_discoveries/_create',
    {
      method: 'POST',
      headers: {
        'kbn-xsrf': 'true',
        // Required by the route (hasInternalKibanaOriginHeader) and by KbnClient.
        'x-elastic-internal-origin': 'Kibana',
        'elastic-api-version': '1',
      },
      body: JSON.stringify({
        alertsContextCount: 0,
        anonymizedAlerts: [],
        apiConfig: { actionTypeId: 'none', connectorId: 'none', model: 'none' },
        connectorName: 'Synthetic (no-LLM)',
        enableFieldRendering: true,
        replacements: undefined,
        withReplacements: false,
        attackDiscoveries: [
          {
            alertIds: doc.alertIds,
            title: doc.title,
            summaryMarkdown: doc.summaryMarkdown,
            detailsMarkdown: doc.detailsMarkdown,
            entitySummaryMarkdown: doc.entitySummaryMarkdown,
            mitreAttackTactics: doc.mitreAttackTactics,
            timestamp: doc.timestamp,
          },
        ],
        // Required by CreateAttackDiscoveryAlertsParams (z.string()); groups the
        // seeded doc(s) into one synthetic generation.
        generationUuid: `eval-${caseId}-${Date.now()}`,
      }),
    }
  )) as { data?: PersistedAttackDiscovery[] };

  const persisted = response?.data?.[0];
  if (!persisted?.id) {
    throw new Error(
      `data_generator route returned no persisted attack discovery id (got ${JSON.stringify(
        response
      ).slice(0, 300)})`
    );
  }
  log.info(`Seeded attack discovery document ${persisted.id} (title: ${doc.title})`);
  return persisted;
};

/**
 * Opens the Investigation conversation the analysis workflow metadata-reads.
 * The conversation id is derived from the AD document id exactly like the
 * review workflow's `resolve_investigation_id` (UUIDv8 from the hex slice) so
 * the whole id chain is deterministic per case. No message is sent: the
 * investigation agent must stay asleep (`ai.conversation.metadata.read`-only
 * contract).
 */
export const seedInvestigation = async (
  { fetch, log }: SeedingClients,
  attackDiscoveryId: string,
  title: string
): Promise<string> => {
  const conversationId = deriveInvestigationId(attackDiscoveryId) ?? randomUuid();
  await fetch('/api/agent_builder/conversations', {
    method: 'POST',
    headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
    body: JSON.stringify({
      conversation_id: conversationId,
      title,
      // The workflow runtime resolves its own internal user via getFakeRequest(),
      // not the REST caller — a private conversation is unreadable by
      // `load_investigation` (client.ts get() permission check). Public mode
      // lets any user with access to the agent read the conversation.
      access_control: { access_mode: 'public' },
    }),
  });
  log.info(`Opened investigation conversation ${conversationId} for AD ${attackDiscoveryId}`);
  return conversationId;
};

// ---------------------------------------------------------------------------
// Workflow run + poll (unchanged contract; inputs now carry only ids)
// ---------------------------------------------------------------------------

/**
 * Seeds the persisted AD document + investigation conversation for a corpus
 * case, then runs the FP/TP analysis workflow with
 * `{ attack_discovery_id, investigation_id }` and polls it to a terminal
 * status. Seeding failures degrade honestly: the returned output carries
 * `seedingError` and `executionStatus: 'failed'` so the case is graded as
 * no-verdict rather than skipped.
 */
export const runAttackDiscoveryWorkflow = async ({
  fetch,
  log,
  payload,
  caseId,
  maxWaitMs = 12 * 60_000,
  pollIntervalMs = 3_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  /** The corpus case payload — rendered into the seeded AD document. */
  payload: Record<string, unknown>;
  /** Corpus case id, used for synthetic alert ids and logging. */
  caseId: string;
  maxWaitMs?: number;
  pollIntervalMs?: number;
}): Promise<AttackDiscoveryTaskOutput> => {
  let seeded: PersistedAttackDiscovery;
  let investigationId: string;
  try {
    seeded = await seedAttackDiscovery(
      { fetch, log },
      buildAttackDiscoveryFromPayload(caseId, payload),
      caseId
    );
    investigationId = await seedInvestigation({ fetch, log }, seeded.id, seeded.title ?? caseId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Seeding failed for case ${caseId}: ${message}`);
    return {
      executionId: 'not-started',
      executionStatus: 'failed' as ExecutionStatus,
      seedingError: message,
    };
  }

  const { workflowExecutionId } = (await fetch(
    `/api/workflows/workflow/${FP_TP_ANALYSIS_WORKFLOW_ID}/run`,
    {
      method: 'POST',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      body: JSON.stringify({
        inputs: {
          attack_discovery_id: seeded.id,
          investigation_id: investigationId,
        },
      }),
    }
  )) as { workflowExecutionId: string };

  log.info(
    `Started fp-tp analysis workflow execution ${workflowExecutionId} for case ${caseId} ` +
      `(AD ${seeded.id}, investigation ${investigationId})`
  );

  const deadline = Date.now() + maxWaitMs;
  let execution: WorkflowExecutionDto | undefined;

  while (Date.now() < deadline) {
    execution = (await fetch(`/api/workflows/executions/${workflowExecutionId}`, {
      method: 'GET',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      query: { includeOutput: true },
    })) as WorkflowExecutionDto;

    if (isTerminal(execution.status)) {
      break;
    }

    await sleep(pollIntervalMs);
  }

  if (!execution) {
    throw new Error(`No execution returned for workflow run ${workflowExecutionId}`);
  }

  if (!isTerminal(execution.status)) {
    log.warning(
      `Workflow execution ${workflowExecutionId} did not reach a terminal status within ${maxWaitMs}ms (last status: ${execution.status})`
    );
  }

  const workflowOutput = readWorkflowOutput(execution);
  const agentVerdict = readAgentVerdict(execution.stepExecutions);

  // GRADED SHAPE: evaluators receive a verdict that always carries the label
  // (string or {verdict,label,...}) — plus, when the emit_result
  // (workflow.output) step carries the full output object, that object
  // (label + summary_markdown + rationale) so PayloadConformance can grade
  // summary passthrough from the actual emitted payload, not just the agent
  // step's structured output. String fallback when neither source exists.
  const verdict: AgentVerdict | undefined =
    workflowOutput?.verdict != null ? workflowOutput : agentVerdict;
  if (!verdict) {
    log.warning(
      `Workflow execution ${workflowExecutionId} produced no verdict (status: ${execution.status})`
    );
  }

  return {
    verdict,
    workflowOutput,
    executionId: workflowExecutionId,
    executionStatus: execution.status,
    traceId: execution.traceId,
  };
};
