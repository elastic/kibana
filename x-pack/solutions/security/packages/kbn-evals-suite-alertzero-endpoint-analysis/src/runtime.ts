/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { ExecutionStatus, isTerminalStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import {
  PROPOSALS_INTERNAL_URL,
  PROPOSALS_API_VERSION,
  type ListProposalsResponse,
  PROPOSAL_BY_ID_URL,
  PROPOSAL_DISMISS_URL,
  proposalSchema,
} from '@kbn/proposals-common';
import {
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_WORKERS_URL,
  ALERTZERO_WORKER_URL_TEMPLATE,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  SECURITY_ROLE_API_VERSION,
  SECURITY_SERVICE_ACCOUNT_URL,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
  buildSecurityRoleUrl,
  getWorkerRoleName,
} from '@kbn/alertzero-common';
import {
  analysisWorkflowId,
  workerWorkflowId,
  proposalWorkflowId,
  gateWorkflowId,
} from './contracts';

const workflowHeaders = { 'elastic-api-version': '2023-10-31', 'kbn-xsrf': 'true' };

// Neither deleteDataStream nor deleteIndexTemplate accepts ignore_unavailable; 404s on
// cleanup (nothing was seeded, or a retry after a partial teardown) are fine.
export const ignore404 = async (step: () => Promise<unknown>) => {
  try {
    await step();
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 404) throw error;
  }
};
export const deleteDataStreamQuietly = (
  es: { indices: { deleteDataStream: (params: { name: string }) => Promise<unknown> } },
  name: string
) => ignore404(() => es.indices.deleteDataStream({ name }));
const proposalHeaders = {
  'elastic-api-version': PROPOSALS_API_VERSION,
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
};
export class AlertZeroRuntime {
  readonly executionIds = new Set<string>();
  private readonly workersToDisable = new Set<string>();
  constructor(public readonly fetch: HttpHandler) {}
  /**
   * Each Worker installs per space as `${workerWorkflowId}-${spaceId}` (see
   * `resolveWorkflowDocumentId` in the workflows management service), so the bare
   * registration id does not address an installed worker document. Resolved from
   * GET /internal/alertzero/workers, which reports the actual document id.
   */
  private workerDocumentId: string | undefined;
  private async requireWorkerDocumentId(): Promise<string> {
    if (this.workerDocumentId) return this.workerDocumentId;
    const response = await this.fetch<{
      workers?: Array<{ id: string; workflowId?: string | null }>;
    }>(ALERTZERO_WORKERS_URL, {
      headers: {
        'elastic-api-version': API_VERSIONS.internal.v1,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': INTERNAL_API_ACCESS,
      },
    });
    const worker = response.workers?.find((entry) => entry.id === workerWorkflowId);
    if (!worker?.workflowId) {
      throw new Error(`Worker ${workerWorkflowId} has no installed workflow document`);
    }
    this.workerDocumentId = worker.workflowId;
    return worker.workflowId;
  }
  async run(workflowId: string, inputs: Record<string, unknown>) {
    // Workers are per-space managed documents: run the suffixed document id, not the
    // registration id (a 404 on the latter is what the buildkite 1425 failure showed).
    const target =
      workflowId === workerWorkflowId ? await this.requireWorkerDocumentId() : workflowId;
    const result = await this.fetch<{ workflowExecutionId: string }>(
      workflowId === workerWorkflowId
        ? '/api/workflows/test'
        : `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`,
      {
        method: 'POST',
        headers: workflowHeaders,
        body: JSON.stringify(
          workflowId === workerWorkflowId ? { workflowId: target, inputs } : { inputs }
        ),
      }
    );
    this.executionIds.add(result.workflowExecutionId);
    return result.workflowExecutionId;
  }
  async read(id: string) {
    return this.fetch<WorkflowExecutionDto>(`/api/workflows/executions/${encodeURIComponent(id)}`, {
      headers: workflowHeaders,
      // The execution API omits step outputs by default; the suite reads the sweep's child
      // execution id and the agent's structured output from them.
      query: { includeOutput: true },
    });
  }
  async wait(id: string, accept: (execution: WorkflowExecutionDto) => boolean, timeout = 180_000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const execution = await this.read(id);
      if (accept(execution)) return execution;
      if ([ExecutionStatus.FAILED, ExecutionStatus.CANCELLED].includes(execution.status)) {
        throw new Error(
          `AlertZero execution ${id}: ${execution.status}: ${JSON.stringify(execution.error)}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`AlertZero execution ${id} timed out`);
  }
  async proposals(conversationId: string) {
    const response = await this.fetch<ListProposalsResponse>(PROPOSALS_INTERNAL_URL, {
      headers: proposalHeaders,
      query: { conversationId, size: 100 },
    });
    return response.proposals.map((proposal) => proposalSchema.parse(proposal));
  }
  async readProposal(id: string) {
    return proposalSchema.parse(
      await this.fetch(PROPOSAL_BY_ID_URL.replace('{id}', encodeURIComponent(id)), {
        headers: proposalHeaders,
      })
    );
  }
  async dismiss(id: string) {
    await this.fetch(PROPOSAL_DISMISS_URL.replace('{id}', encodeURIComponent(id)), {
      method: 'POST',
      headers: proposalHeaders,
      body: JSON.stringify({ dismissReason: 'no_reason', rationale: 'AlertZero eval cleanup' }),
    });
  }
  async cancelAll() {
    for (const id of this.executionIds) {
      const execution = await this.read(id);
      if (
        ![ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED].includes(
          execution.status
        )
      ) {
        // Cleanup, not verification: a failed cancel must never mask the test's own
        // verdict. But an error is only tolerated when the execution is actually done:
        // the server's cancel can fail (e.g. 500) because the execution reached a
        // terminal state between the read above and this call (cancelWorkflow returns
        // silently for terminal executions, so the error comes from the race inside
        // the call). Re-read the execution and swallow only if it is now terminal;
        // otherwise rethrow — a still-running execution means real cleanup leaked.
        await this.fetch(`/api/workflows/executions/${encodeURIComponent(id)}/cancel`, {
          method: 'POST',
          headers: workflowHeaders,
        }).catch(async (error: Error) => {
          const after = await this.read(id);
          if (!isTerminalStatus(after.status)) throw error;
          // eslint-disable-next-line no-console -- best-effort cleanup signal, no logger here
          console.warn(
            `AlertZero eval cleanup: execution ${id} reached terminal state ${after.status} before the cancel landed: ${error.message}`
          );
        });
      }
    }
  }
  async assertInstalled() {
    for (const id of [analysisWorkflowId, proposalWorkflowId, gateWorkflowId]) {
      const workflow = await this.fetch<{ id: string; valid: boolean }>(
        `/api/workflows/workflow/${encodeURIComponent(id)}`,
        { headers: workflowHeaders }
      );
      if (workflow.id !== id || !workflow.valid)
        throw new Error(`Required production workflow unavailable: ${id}`);
    }
    // The Worker is a per-space managed document (`${workerWorkflowId}-${spaceId}`), not a
    // global workflow: read it via the workers API and assert on the suffixed document id.
    const documentId = await this.requireWorkerDocumentId();
    const workflow = await this.fetch<{ id: string; valid: boolean }>(
      `/api/workflows/workflow/${encodeURIComponent(documentId)}`,
      { headers: workflowHeaders }
    );
    if (workflow.id !== documentId || !workflow.valid)
      throw new Error(`Required worker workflow unavailable: ${documentId}`);
  }

  /**
   * Global AlertZero workflows install at plugin start, but each Worker is a per-space
   * managed document (yamlTemplate) that installs only on its first save/enable via
   * PATCH /internal/alertzero/workers/{workerId}. Since #295215 the PATCH is REJECTED while
   * the Worker has no service account (`nextEnabled && !nextAccount` → 400), so on a fresh
   * stack a bare `{"enabled":true}` never installs anything. The eval therefore finds or creates a
   * service account bound to the Worker's built-in role (`alertzero_endpoint_analysis`, never
   * created or changed here) — the same setup `ensureWorkerServiceAccounts` performs for the UI,
   * against the same public APIs — and passes its id in the same PATCH. The workflow test API refuses a disabled workflow, so the
   * Worker stays enabled until `restoreWorker()`. Idempotent: a second PATCH with
   * the same body is a no-op revision bump. The built-in role is checked on every run and an
   * existing account is reused.
   */
  async installWorker(id: string): Promise<void> {
    const serviceAccountId = await ensureWorkerServiceAccount(this.fetch, id);
    const response = await this.fetch<{
      workers?: Array<{ id: string; enabled?: boolean; settingsRevision?: number | null }>;
    }>(ALERTZERO_WORKERS_URL, {
      headers: {
        'elastic-api-version': API_VERSIONS.internal.v1,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': INTERNAL_API_ACCESS,
      },
    });
    const existing = response.workers?.find((worker) => worker.id === id);
    const wasEnabled = existing?.enabled ?? false;
    // A settings patch must carry the revision it was built from: the workers service rejects
    // any `settings` update without a matching `settingsRevision` (conflict-check), so a bare
    // `{enabled: true, settings}` fails during setup on a Worker installed by an earlier run.
    const settingsRevision = existing?.settingsRevision ?? null;
    await this.fetch(ALERTZERO_WORKER_URL_TEMPLATE.replace('{workerId}', encodeURIComponent(id)), {
      method: 'PATCH',
      headers: {
        'elastic-api-version': API_VERSIONS.internal.v1,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': INTERNAL_API_ACCESS,
      },
      body: JSON.stringify({
        enabled: true,
        settings: { serviceAccountId },
        settingsRevision,
      }),
    });
    // A Worker that was off before the suite must be off after it: the per-space schedule
    // would otherwise keep sweeping the stack's indicators for unrelated alerts every
    // interval after the eval ends. The workflow test API REFUSES a disabled workflow
    // (400 "Workflow is disabled", build 1430), so the Worker has to stay enabled while the
    // suite runs; `restoreWorker()` turns it back off from the suite's cleanup. The account
    // stays bound either way, and on a fresh stack the Worker did not exist before this run.
    if (!wasEnabled) this.workersToDisable.add(id);
  }

  /** Disables every Worker `installWorker` enabled that was off before the suite. */
  async restoreWorker(): Promise<void> {
    for (const id of [...this.workersToDisable]) {
      await this.fetch(
        ALERTZERO_WORKER_URL_TEMPLATE.replace('{workerId}', encodeURIComponent(id)),
        {
          method: 'PATCH',
          headers: {
            'elastic-api-version': API_VERSIONS.internal.v1,
            'kbn-xsrf': 'true',
            'x-elastic-internal-origin': INTERNAL_API_ACCESS,
          },
          body: JSON.stringify({ enabled: false }),
        }
      );
      this.workersToDisable.delete(id);
    }
  }
}

interface ServiceAccountEntry {
  id: string;
  name: string;
  enabled: boolean;
  assumable: boolean;
}

const XSRF = { 'kbn-xsrf': 'true' };

const statusOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const { status, statusCode, response } = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };
  const code = [status, statusCode, response?.status].find((value) => typeof value === 'number');
  return typeof code === 'number' ? code : undefined;
};

const isServerlessDeployment = async (fetch: HttpHandler): Promise<boolean> => {
  const status = await fetch<{ version?: { build_flavor?: string } }>('/api/status', {
    method: 'GET',
  });
  return status.version?.build_flavor === 'serverless';
};

/**
 * The Worker's role is built in: an Elasticsearch reserved role on stateful, a predefined role on
 * Serverless. The eval only looks it up and never creates or changes it, so a stack that lacks it
 * fails here, naming the role, rather than silently running the Worker with different powers.
 */
const findBuiltInRole = async (fetch: HttpHandler, accountName: string): Promise<string> => {
  const isServerless = await isServerlessDeployment(fetch);
  const roleName = getWorkerRoleName(accountName, { isServerless });
  const missing = () =>
    new Error(
      `Built-in ${
        isServerless ? 'predefined' : 'reserved'
      } role "${roleName}" is missing on this ` +
        'stack; the AlertZero evals do not create Worker roles.'
    );
  let role: { metadata?: { _reserved?: unknown } };
  try {
    role = await fetch<{ metadata?: { _reserved?: unknown } }>(buildSecurityRoleUrl(roleName), {
      method: 'GET',
      headers: { ...XSRF, 'elastic-api-version': SECURITY_ROLE_API_VERSION },
    });
  } catch (error) {
    throw statusOf(error) === 404 ? missing() : error;
  }
  if (role.metadata?._reserved !== true) throw missing();
  return roleName;
};

/**
 * Finds or creates the service account the Worker runs as, bound to the Worker's built-in role
 * (the lookup the onboarding "ensure worker service accounts" step uses), and returns its id.
 * The role is checked on every run, even when the account already exists, so a stack without it
 * fails loudly. An existing account is reused.
 */
const ensureWorkerServiceAccount = async (
  fetch: HttpHandler,
  workerId: string
): Promise<string> => {
  if (workerId !== SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID) {
    throw new Error(`No service account provisioning implemented for worker: ${workerId}`);
  }
  const accountName = WORKER_SERVICE_ACCOUNT_NAMES[workerId];
  if (!accountName) {
    throw new Error(`No built-in role/service account for Worker "${workerId}".`);
  }
  const roleName = await findBuiltInRole(fetch, accountName);
  const listAccounts = async () => {
    const accounts: ServiceAccountEntry[] = [];
    let after: string | undefined;
    do {
      const page = await fetch<{ serviceAccounts: ServiceAccountEntry[]; nextPage?: string }>(
        SECURITY_SERVICE_ACCOUNT_URL,
        { headers: XSRF, query: { limit: 100, ...(after ? { after } : {}) } }
      );
      accounts.push(...page.serviceAccounts);
      after = page.nextPage;
    } while (after);
    return accounts;
  };
  const existing = (await listAccounts()).find((account) => account.name === accountName);
  if (existing) return existing.id;
  try {
    const created = await fetch<{ id: string }>(SECURITY_SERVICE_ACCOUNT_URL, {
      method: 'POST',
      headers: XSRF,
      body: JSON.stringify({
        name: accountName,
        description: 'AlertZero endpoint-analysis eval service account',
        roles: [roleName],
      }),
    });
    return created.id;
  } catch (error) {
    if (statusOf(error) !== 409) throw error;
    // Created concurrently: list again and use that one.
    const account = (await listAccounts()).find((candidate) => candidate.name === accountName);
    if (!account) throw error;
    return account.id;
  }
};

const AI_INDEX_ROUTE = '/api/context_engine/ai_index';
// The built-in `alertzero_endpoint_analysis` role can only read/write production's AI index, so
// the eval seeds into that same index (`HUNT_COVERAGE_AI_INDEX_ID` in the alertzero plugin,
// restated because the plugin is not a dependency of this suite) rather than a private one.
export const EVAL_AI_INDEX_ID = 'security-investigations';
const EVAL_AI_INDEX_DEST = `ai-index-idx-${EVAL_AI_INDEX_ID}`;
// Same window as the sweep's `lookback_days` default (forensics_endpoint_analysis.yaml).
const SWEEP_LOOKBACK_DAYS = 7;
const SEEDED_SPACE_ID = 'default';

/** Registers the shared AI index when missing, as production's first writer does lazily. */
const ensureAiIndexRegistered = async (fetch: HttpHandler) => {
  const url = `${AI_INDEX_ROUTE}/${encodeURIComponent(EVAL_AI_INDEX_ID)}`;
  try {
    await fetch(url, { method: 'GET', headers: workflowHeaders });
    return;
  } catch (error) {
    if (statusOf(error) !== 404) throw error;
  }
  await fetch(AI_INDEX_ROUTE, {
    method: 'POST',
    headers: workflowHeaders,
    body: JSON.stringify({
      id: EVAL_AI_INDEX_ID,
      description: 'AlertZero security investigations indicators',
      dest: { type: 'index', value: EVAL_AI_INDEX_DEST },
    }),
  });
};

/**
 * The sweep (`search_pending_indicators`) scans the whole shared index oldest-pending-first with
 * no `ki_id` filter, so any other pending `security.analyze_endpoint` KI in this space within
 * the lookback would be analysed instead of ours. Fail naming those ids rather than evaluate
 * someone else's data; they are never deleted. Mirrors the sweep's filter exactly.
 *
 * This narrows the race but cannot close it: a concurrent writer can add a pending KI between
 * this check (run while seeding, just before the sweep) and the sweep's search.
 */
export const assertNoCompetingPendingKis = async (es: Client, ownKiId: string) => {
  const response = await es.search<{ id?: string }>({
    index: EVAL_AI_INDEX_DEST,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 20,
    _source: ['id'],
    query: {
      bool: {
        filter: [
          { term: { type: 'security.analyze_endpoint' } },
          { term: { 'attributes.status': 'pending' } },
          { term: { 'attributes.space_id': SEEDED_SPACE_ID } },
          { range: { '@timestamp': { gte: `now-${SWEEP_LOOKBACK_DAYS}d` } } },
        ],
        must_not: [{ term: { id: ownKiId } }, { ids: { values: [ownKiId] } }],
      },
    },
  });
  const others = response.hits.hits.map((hit) => hit._source?.id ?? hit._id);
  if (others.length > 0) {
    throw new Error(
      `Refusing to run: ${others.length} other pending security.analyze_endpoint KI(s) in ` +
        `${EVAL_AI_INDEX_DEST} (space ${SEEDED_SPACE_ID}, last ${SWEEP_LOOKBACK_DAYS}d) would be ` +
        `swept before the eval's KI ${ownKiId}: ${others.join(', ')}. Not deleting them; remove ` +
        'or settle them and rerun.'
    );
  }
};
const ATTACK_DISCOVERY_ADHOC_INDEX = '.adhoc.alerts-security.attack.discovery.alerts-default';
// Constituent detections live in the space's detections index, which exists in the
// suite's stack before the spec runs — the attack-analysis suite indexes into it the
// same way without creating it.
const CONSTITUENT_ALERTS_INDEX = '.alerts-security.alerts-default';
// Matches `ALERT_ATTACK_DISCOVERY_ALERT_IDS` from @kbn/attack-discovery-schedules-common
// (`kibana.alert.attack_discovery.alert_ids`), restated locally: the package is not a
// kbn_reference of this suite, and the workflow's read path (forensics_run_endpoint_analysis.yaml,
// `fetch_attack_discovery_alert` → `extract_host_from_ad_constituent_alerts`) reads this key.
// A test below pins the seeded shape against the workflow's read path, so drift on either
// side fails the suite rather than silently skipping the analysis.
const AD_ALERT_IDS_KEY = 'kibana.alert.attack_discovery.alert_ids';
export const SEEDED_COMMAND = 'powershell.exe -EncodedCommand SQBFAFgA';

export const seedAlertZeroEndpoint = async (
  es: Client,
  fetch: HttpHandler,
  {
    conclusive = true,
  }: {
    /**
     * Ground truth of the seeded telemetry. The default seeds the malicious
     * encoded-PowerShell tree; `conclusive: false` seeds a benign process tree
     * on the same host shape, so the action-safety check exercises the
     * disruptive-action-on-inconclusive-ground-truth branch live.
     */
    conclusive?: boolean;
  } = {}
) => {
  const id = randomUUID();
  const host = `AZ-EVAL-${id.slice(0, 8)}`;
  const endpointId = `alertzero-eval-${id}`;
  const index = `logs-endpoint.events.process-alertzero-eval-${id}`;
  const aiIndexId = EVAL_AI_INDEX_ID;
  const aiIndexDest = EVAL_AI_INDEX_DEST;
  const kiId = `alertzero-ki-${id}`;
  const attackDiscoveryAlertId = `alertzero-discovery-${id}`;
  const constituentAlertId = `alertzero-constituent-${id}`;
  let conversationId: string | undefined;
  let kiSeeded = false;

  // Every step is attempted, so a failure while seeding cannot leave earlier resources behind.
  const cleanup = async () => {
    const steps: Array<() => Promise<unknown>> = [
      async () =>
        conversationId &&
        fetch(`/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`, {
          method: 'DELETE',
          headers: workflowHeaders,
        }),
      // The AI index is shared with production: delete only the KI this run seeded (a single
      // document id), never the index or its registration.
      async () =>
        kiSeeded &&
        es.delete({ index: aiIndexDest, id: kiId, refresh: 'wait_for' }, { ignore: [404] }),
      async () =>
        Promise.all([
          deleteDataStreamQuietly(es, index),
          ignore404(() => es.indices.deleteIndexTemplate({ name: `${index}-tpl` })),
        ]),
      async () =>
        es.delete(
          {
            index: ATTACK_DISCOVERY_ADHOC_INDEX,
            id: attackDiscoveryAlertId,
            refresh: 'wait_for',
          },
          { ignore: [404] }
        ),
      async () =>
        es.delete(
          {
            index: CONSTITUENT_ALERTS_INDEX,
            id: constituentAlertId,
            refresh: 'wait_for',
          },
          { ignore: [404] }
        ),
    ];
    const results = await Promise.allSettled(steps.map((step) => step()));
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  };

  try {
    const conversation = await fetch<{ id: string }>('/api/agent_builder/conversations', {
      method: 'POST',
      headers: workflowHeaders,
      body: JSON.stringify({
        title: `AlertZero endpoint eval ${id}`,
        template_id: 'investigation',
        // Private (the default) hides the conversation from the workflow's effective identity,
        // a service account distinct from this suite user: verify_investigation then reports
        // "Conversation not found" and the run retires the indicator without analysing it.
        access_control: { access_mode: 'public' },
      }),
    });
    conversationId = conversation.id;
    // `logs-*` names can only be data streams (the logs index template matches): install an
    // index template carrying the mappings, create the data stream, then append with
    // op_type create so every write lands on a fresh backing index.
    await es.indices.putIndexTemplate({
      name: `${index}-tpl`,
      index_patterns: [index],
      data_stream: {},
      template: {
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            event: {
              properties: {
                id: { type: 'keyword' },
                category: { type: 'keyword' },
                type: { type: 'keyword' },
              },
            },
            host: { properties: { name: { type: 'keyword' } } },
            process: {
              properties: {
                name: { type: 'keyword' },
                command_line: { type: 'keyword' },
                entity_id: { type: 'keyword' },
                parent: {
                  properties: { name: { type: 'keyword' }, entity_id: { type: 'keyword' } },
                },
              },
            },
          },
        },
      },
    });
    await es.indices.createDataStream({ name: index });
    const now = Date.now();
    // Malicious: encoded PowerShell spawned by a document process. Benign: an ordinary
    // document print flow (Word -> the 32-bit print spooler helper `splwow64.exe`, not a
    // LOLBAS binary) — same host, same shape, nothing an analysis may act on.
    const events = conclusive
      ? [
          { name: 'WINWORD.EXE', command_line: 'WINWORD.EXE invoice.docm', parent: 'explorer.exe' },
          { name: 'powershell.exe', command_line: SEEDED_COMMAND, parent: 'WINWORD.EXE' },
        ]
      : [
          { name: 'WINWORD.EXE', command_line: 'WINWORD.EXE invoice.docx', parent: 'explorer.exe' },
          {
            name: 'splwow64.exe',
            command_line: 'C:\\Windows\\splwow64.exe 12288',
            parent: 'WINWORD.EXE',
          },
        ];
    const eventIds = events.map((_, i) => `${id}-${i}`);
    for (const [i, event] of events.entries()) {
      await es.index({
        index,
        id: eventIds[i],
        op_type: 'create',
        document: {
          '@timestamp': new Date(now - (2 - i) * 60_000).toISOString(),
          event: { id: eventIds[i], category: ['process'], type: ['start'], kind: 'event' },
          host: { name: host, id: host, os: { type: 'windows' } },
          agent: { id: endpointId, type: 'endpoint' },
          process: {
            name: event.name,
            command_line: event.command_line,
            entity_id: eventIds[i],
            parent: { name: event.parent, entity_id: i ? eventIds[0] : 'root' },
          },
        },
        refresh: 'wait_for',
      });
    }
    // The production analysis resolves the host from the Attack Discovery alert named by the
    // KI's `attack_discovery_alert_id`, not from the KI's own `host_name`; without a real alert
    // the child skips forensic analysis. Production AD alert documents (transformToBaseAlertDocument
    // in @kbn/attack-discovery-schedules-common) carry `kibana.alert.attack_discovery.alert_ids`
    // and NO host of their own: the workflow first reads a `host.name` from the AD doc, then —
    // for every real alert — resolves it from the AD doc's constituent detections via a
    // `host.name` terms aggregation over `.alerts-security.alerts-<space>`. Mirror that shape:
    // flat `alert_ids` key, nested `host.name` on the constituent detection.
    await es.index({
      index: ATTACK_DISCOVERY_ADHOC_INDEX,
      id: attackDiscoveryAlertId,
      refresh: 'wait_for',
      document: {
        '@timestamp': new Date(now).toISOString(),
        'kibana.space_ids': ['default'],
        'kibana.alert.uuid': attackDiscoveryAlertId,
        'kibana.alert.rule.rule_type_id': 'attack-discovery',
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.status': 'active',
        [AD_ALERT_IDS_KEY]: [constituentAlertId],
      },
    });
    await es.index({
      index: CONSTITUENT_ALERTS_INDEX,
      id: constituentAlertId,
      refresh: 'wait_for',
      document: {
        '@timestamp': new Date(now).toISOString(),
        'kibana.alert.uuid': constituentAlertId,
        host: { name: host },
      },
    });
    await ensureAiIndexRegistered(fetch);
    // Before our KI exists, so a refusal leaves nothing of ours in the shared index.
    await assertNoCompetingPendingKis(es, kiId);
    kiSeeded = true;
    await es.index({
      index: aiIndexDest,
      id: kiId,
      refresh: 'wait_for',
      document: {
        '@timestamp': new Date().toISOString(),
        id: kiId,
        type: 'security.analyze_endpoint',
        name: 'AlertZero endpoint eval',
        content: `Analyze ${host}`,
        attributes: {
          space_id: 'default',
          status: 'pending',
          investigation_id: conversation.id,
          attack_discovery_alert_id: attackDiscoveryAlertId,
          host_name: host,
          autonomy: 'manual',
          reason: conclusive
            ? 'Encoded PowerShell launched by document process'
            : 'Benign document workflow on a clean host',
        },
      },
    });
    return {
      host,
      endpointId,
      eventIds,
      command: SEEDED_COMMAND,
      conclusive,
      index,
      aiIndexId,
      kiId,
      conversationId: conversation.id,
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
};

const INFERENCE_SETTINGS_ROUTE = '/internal/search_inference_endpoints/settings';
const INFERENCE_SETTINGS_HEADERS = { 'elastic-api-version': '1', 'kbn-xsrf': 'true' };

interface InferenceFeatureSetting {
  feature_id: string;
  endpoints: Array<{ id: string }>;
}

const readInferenceFeatures = async (fetch: HttpHandler) =>
  (
    await fetch<{ data: { features: InferenceFeatureSetting[] } }>(INFERENCE_SETTINGS_ROUTE, {
      headers: INFERENCE_SETTINGS_HEADERS,
    })
  ).data.features;

const writeInferenceFeatures = (fetch: HttpHandler, features: InferenceFeatureSetting[]) =>
  fetch(INFERENCE_SETTINGS_ROUTE, {
    method: 'PUT',
    headers: INFERENCE_SETTINGS_HEADERS,
    body: JSON.stringify({ features }),
  });

/**
 * The production analysis workflow resolves its model through the fixed `alertzero_balanced`
 * inference feature (`connector-id-by-feature`), not the eval project's connector. Route that
 * feature to the connector under test and return a function restoring the previous settings.
 * The PUT replaces the whole document, so every other feature is preserved.
 */
export const pinAgenticConnector = async (fetch: HttpHandler, connectorId: string) => {
  const previous = await readInferenceFeatures(fetch);
  await writeInferenceFeatures(fetch, [
    ...previous.filter(
      ({ feature_id: featureId }) => featureId !== ALERTZERO_BALANCED_INFERENCE_FEATURE_ID
    ),
    { feature_id: ALERTZERO_BALANCED_INFERENCE_FEATURE_ID, endpoints: [{ id: connectorId }] },
  ]);
  return () => writeInferenceFeatures(fetch, previous);
};

/**
 * Enables the Worker, asserts the production workflows and pins the agentic connector, then
 * returns the function that restores the inference settings. Setup runs before the caller's
 * `try/finally`, so a failure here (workflow unavailable, pin rejected) would otherwise leave a
 * Worker that was off before the suite enabled and scheduled. On failure this disables the
 * Worker itself and rethrows the original error.
 */
export const installWorkerAndPinConnector = async (
  runtime: AlertZeroRuntime,
  fetch: HttpHandler,
  workerId: string,
  connectorId: string
): Promise<() => Promise<unknown>> => {
  try {
    await runtime.installWorker(workerId);
    await runtime.assertInstalled();
    return await pinAgenticConnector(fetch, connectorId);
  } catch (error) {
    try {
      await runtime.restoreWorker();
    } catch {
      // The setup failure is the actionable error; a failed rollback must not mask it.
    }
    throw error;
  }
};

/**
 * Runs every cleanup step even when an earlier one throws, so a failed cancellation or fixture
 * teardown can never leave the shared inference settings pinned to the eval connector. The first
 * failure is rethrown once all steps have run.
 */
export const runAllCleanups = async (steps: Array<() => Promise<unknown>>) => {
  const failures: unknown[] = [];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw failures[0];
};
