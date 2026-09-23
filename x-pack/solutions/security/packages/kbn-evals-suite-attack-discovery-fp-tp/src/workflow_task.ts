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
  verdict?: WorkflowVerdict;
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
 * Reads the workflow output (`workflow.output` step) when the execution record
 * carries it.
 */
export const readWorkflowOutput = (execution: WorkflowExecutionDto): WorkflowOutput | undefined =>
  (execution as { output?: WorkflowOutput | null }).output ?? undefined;

/**
 * Scans the agent step's execution records for a structured_output verdict.
 * Each step yields multiple records (an enter record whose `output` is null,
 * plus the record carrying the result), so we scan every agent-step record —
 * enter records are skipped naturally by the null-output guard. A missing
 * verdict is reported as `undefined`, not thrown.
 */
export const readAgentVerdict = (
  stepExecutions: WorkflowStepExecutionDto[]
): WorkflowVerdict | undefined => {
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
  task.verdict?.verdict ??
  task.verdict?.label ??
  task.verdict?.classification;

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

/**
 * Builds the CreateAttackDiscoveryAlertsParams' `attackDiscoveries` entry from
 * a corpus case. The gold label / gold_rationale are NEVER rendered into the
 * document — the workflow must classify from evidence alone.
 */
export const buildAttackDiscoveryFromPayload = (
  caseId: string,
  payload: Record<string, unknown>
): {
  title: string;
  summaryMarkdown: string;
  detailsMarkdown: string;
  entitySummaryMarkdown?: string;
  mitreAttackTactics: string[];
  alertIds: string[];
  timestamp?: string;
} => {
  const ev = payload as CorpusEvidence;
  const categories = listOf(ev.Category);
  const detectors = listOf(ev.DetectorNames);
  const techniques = listOf(ev.MitreTechniques);
  const actions = listOf(ev.ActionGrouped);
  const granular = listOf(ev.ActionGranular);
  const devices = listOf(ev.Devices);
  const accounts = listOf(ev.Accounts);
  const alertIds = [`case-${caseId}-alert-1`];

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
    alertIds,
    timestamp: typeof ev.Timestamp === 'string' ? ev.Timestamp : undefined,
  };
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
  doc: ReturnType<typeof buildAttackDiscoveryFromPayload>
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
    body: JSON.stringify({ conversation_id: conversationId, title }),
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
      buildAttackDiscoveryFromPayload(caseId, payload)
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
  const verdict = readAgentVerdict(execution.stepExecutions);
  if (!verdict && !workflowOutput?.verdict) {
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
