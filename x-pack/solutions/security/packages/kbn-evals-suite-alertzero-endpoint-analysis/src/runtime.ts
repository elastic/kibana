/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import {
  PROPOSALS_INTERNAL_URL,
  PROPOSALS_API_VERSION,
  type ListProposalsResponse,
  PROPOSAL_BY_ID_URL,
  PROPOSAL_DISMISS_URL,
  proposalSchema,
} from '@kbn/proposals-common';
import {
  ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID,
  ALERTZERO_WORKER_URL_TEMPLATE,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { analysisWorkflowId, workerWorkflowId, proposalWorkflowId } from './contracts';

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
  constructor(public readonly fetch: HttpHandler) {}
  async run(workflowId: string, inputs: Record<string, unknown>) {
    const result = await this.fetch<{ workflowExecutionId: string }>(
      workflowId === workerWorkflowId
        ? '/api/workflows/test'
        : `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`,
      {
        method: 'POST',
        headers: workflowHeaders,
        body: JSON.stringify(workflowId === workerWorkflowId ? { workflowId, inputs } : { inputs }),
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
        await this.fetch(`/api/workflows/executions/${encodeURIComponent(id)}/cancel`, {
          method: 'POST',
          headers: workflowHeaders,
        });
      }
    }
  }
  async assertInstalled() {
    for (const id of [workerWorkflowId, analysisWorkflowId, proposalWorkflowId]) {
      const workflow = await this.fetch<{ id: string; valid: boolean }>(
        `/api/workflows/workflow/${encodeURIComponent(id)}`,
        { headers: workflowHeaders }
      );
      if (workflow.id !== id || !workflow.valid)
        throw new Error(`Required production workflow unavailable: ${id}`);
    }
  }

  /**
   * Global AlertZero workflows install at plugin start, but each Worker is a per-space
   * managed document (yamlTemplate) that installs only on its first save/enable via
   * PATCH /internal/alertzero/workers/{workerId}. Enabling installs the defaults and
   * leaves the scheduled worker running; the suite uses the workflow test API, which
   * executes the installed definition regardless of the enabled flag, so the schedule
   * stays on. Idempotent: a second PATCH with the same body is a no-op revision bump.
   */
  async installWorker(id: string): Promise<void> {
    await this.fetch(ALERTZERO_WORKER_URL_TEMPLATE.replace('{workerId}', encodeURIComponent(id)), {
      method: 'PATCH',
      headers: {
        'elastic-api-version': API_VERSIONS.internal.v1,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': INTERNAL_API_ACCESS,
      },
      body: JSON.stringify({ enabled: true }),
    });
  }
}

const AI_INDEX_ROUTE = '/api/context_engine/ai_index';
const ATTACK_DISCOVERY_ADHOC_INDEX = '.adhoc.alerts-security.attack.discovery.alerts-default';
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
  const aiIndexId = `alertzero-eval-${id}`;
  const aiIndexDest = `ai-index-idx-${aiIndexId}`;
  const kiId = `alertzero-ki-${id}`;
  const attackDiscoveryAlertId = `alertzero-discovery-${id}`;
  let conversationId: string | undefined;
  let aiIndexCreated = false;

  // Every step is attempted, so a failure while seeding cannot leave earlier resources behind.
  const cleanup = async () => {
    const steps: Array<() => Promise<unknown>> = [
      async () =>
        conversationId &&
        fetch(`/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`, {
          method: 'DELETE',
          headers: workflowHeaders,
        }),
      async () =>
        aiIndexCreated &&
        fetch(`${AI_INDEX_ROUTE}/${encodeURIComponent(aiIndexId)}`, {
          method: 'DELETE',
          headers: workflowHeaders,
        }),
      async () =>
        Promise.all([
          deleteDataStreamQuietly(es, index),
          ignore404(() => es.indices.delete({ index: aiIndexDest, ignore_unavailable: true })),
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
    // the child skips forensic analysis.
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
        'host.name': host,
      },
    });
    await fetch(AI_INDEX_ROUTE, {
      method: 'POST',
      headers: workflowHeaders,
      body: JSON.stringify({
        id: aiIndexId,
        description: 'Isolated AlertZero endpoint eval indicators',
        dest: { type: 'index', value: aiIndexDest },
      }),
    });
    aiIndexCreated = true;
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
 * The production analysis workflow resolves its model through the fixed `alertzero_agentic`
 * inference feature (`connector-id-by-feature`), not the eval project's connector. Route that
 * feature to the connector under test and return a function restoring the previous settings.
 * The PUT replaces the whole document, so every other feature is preserved.
 */
export const pinAgenticConnector = async (fetch: HttpHandler, connectorId: string) => {
  const previous = await readInferenceFeatures(fetch);
  await writeInferenceFeatures(fetch, [
    ...previous.filter(
      ({ feature_id: featureId }) => featureId !== ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID
    ),
    { feature_id: ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID, endpoints: [{ id: connectorId }] },
  ]);
  return () => writeInferenceFeatures(fetch, previous);
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
