/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import {
  AI_INDEX_KI_BACKING_INDEX,
  AI_INDEX_URL,
  CONVERSATIONS_URL,
  SECURITY_INVESTIGATIONS_AI_INDEX_ID,
} from './constants';
import { listInvestigationProposals } from './investigations';
import type { InvestigationProposal } from './investigations';
import { listExecutionIds } from './alertzero';
import type { WorkflowExecution } from './alertzero';
import { ok, pollUntil } from './kbn';
import type { AlertZeroApi } from './kbn';

/**
 * Waits for a pending proposal whose action workflow matches and that was created after `since`.
 * `since` keeps a re-run from grabbing a proposal left behind by an earlier failed run.
 */
export const waitForProposal = async (
  api: AlertZeroApi,
  actionWorkflowId: string,
  since: string,
  { timeoutMs }: { timeoutMs: number }
): Promise<InvestigationProposal> =>
  pollUntil(
    `a pending ${actionWorkflowId} proposal`,
    async () =>
      (await listInvestigationProposals(api)).find(
        (proposal) => proposal.actionWorkflowId === actionWorkflowId && proposal.createdAt >= since
      ),
    { timeoutMs }
  );

/**
 * Creates the Investigation conversation the endpoint analysis attaches its findings to. The
 * template id is what the AlertZero workflows themselves pass to `ai.conversation.create`; the
 * metadata shape is their `status: open` contract.
 */
export const createInvestigation = async (
  api: AlertZeroApi,
  title: string,
  description: string
): Promise<string> =>
  ok(
    await api.public<{ id: string }>('POST', CONVERSATIONS_URL, {
      body: {
        title,
        access_control: { access_mode: 'public' },
        template_id: 'investigation',
        metadata: { status: 'open', description, workflow_execution_ids: [] },
      },
    }),
    `create investigation ${title}`
  ).id;

export interface AttachmentVersion<DataType = unknown> {
  readonly version: number;
  readonly data?: DataType;
}

export interface ConversationAttachment<DataType = unknown> {
  readonly id?: string;
  /** Set when the attachment was created with a caller-supplied id. */
  readonly client_id?: string;
  readonly type?: string;
  readonly current_version?: number;
  readonly versions?: readonly AttachmentVersion<DataType>[];
}

const isAttachment = (attachment: ConversationAttachment, id: string): boolean =>
  [attachment.id, attachment.client_id].some((candidate) => candidate?.includes(id));

/** True when the investigation holds an attachment created under (or named) `id`. */
export const hasAttachment = (
  attachments: ReadonlyArray<ConversationAttachment>,
  id: string
): boolean => attachments.some((attachment) => isAttachment(attachment, id));

export const listAttachments = async <T = unknown>(
  api: AlertZeroApi,
  conversationId: string
): Promise<Array<ConversationAttachment<T>>> =>
  ok(
    await api.public<{ results: Array<ConversationAttachment<T>> }>(
      'GET',
      `${CONVERSATIONS_URL}/${encodeURIComponent(conversationId)}/attachments`
    ),
    `list attachments of ${conversationId}`
  ).results;

/** The data of the attachment's current version; undefined when it is absent or carries none. */
export const attachmentData = <T>(
  attachments: ReadonlyArray<ConversationAttachment>,
  id: string
): T | undefined => {
  const attachment = attachments.find((candidate) => isAttachment(candidate, id));
  const current =
    attachment?.versions?.find((version) => version.version === attachment.current_version) ??
    attachment?.versions?.[attachment.versions.length - 1];
  return current?.data as T | undefined;
};

export interface SeedIdentifiers {
  /** `host.name` of every seeded document, i.e. every host the run may legitimately cite. */
  readonly hostNames: ReadonlySet<string>;
  /**
   * Hosts the seeded telemetry names as a network destination (`destination.domain`, plus its
   * short name): the attack chain moves laterally to them without any document being logged
   * from them, so an analysis may cite them without them being a `host.name`.
   */
  readonly destinationHosts: ReadonlySet<string>;
  /** `agent.id` -> `host.name`, the map a containment card's endpoint ids resolve through. */
  readonly hostByAgentId: ReadonlyMap<string, string>;
  readonly entityIds: ReadonlySet<string>;
  readonly pids: ReadonlySet<number>;
}

interface SeededDocumentSource {
  host?: { name?: string };
  agent?: { id?: string };
  destination?: { domain?: string };
  process?: { entity_id?: string; pid?: number };
}

/**
 * Reads the identifiers back out of the documents the seed actually wrote (keyed on the run
 * marker the seeder returned), so an assertion compares the analysis output against the real seed
 * rather than against a re-derivation of it that could drift from what was indexed.
 */
export const readSeedIdentifiers = async (
  esClient: EsClient,
  runMarker: string,
  indices: readonly string[]
): Promise<SeedIdentifiers> => {
  // The marker is matched through a runtime field over `_source`, not the mapped
  // `labels.ad_portable_seed`: whether that field is mapped depends on which template created the
  // index first (the endpoint package's `dynamic: false` templates and the alerts index never map
  // it), so a plain `term` on it can match nothing.
  const response = await esClient.search({
    index: [...indices],
    size: 1000,
    runtime_mappings: {
      seed_marker: {
        type: 'keyword',
        script: {
          source:
            'def labels = params._source.labels; if (labels instanceof Map && labels.ad_portable_seed != null) { emit(labels.ad_portable_seed.toString()); }',
        },
      },
    },
    query: { term: { seed_marker: runMarker } },
  });
  const hostNames = new Set<string>();
  const destinationHosts = new Set<string>();
  const hostByAgentId = new Map<string, string>();
  const entityIds = new Set<string>();
  const pids = new Set<number>();

  for (const hit of response.hits?.hits ?? []) {
    const source = hit._source as SeededDocumentSource | undefined;
    const hostName = source?.host?.name;
    const agentId = source?.agent?.id;
    const destinationDomain = source?.destination?.domain;
    if (hostName) {
      hostNames.add(hostName);
    }
    if (destinationDomain) {
      destinationHosts.add(destinationDomain);
      destinationHosts.add(destinationDomain.split('.')[0]);
    }
    if (hostName && agentId) {
      hostByAgentId.set(agentId, hostName);
    }
    if (source?.process?.entity_id) {
      entityIds.add(source.process.entity_id);
    }
    if (typeof source?.process?.pid === 'number') {
      pids.add(source.process.pid);
    }
  }

  return { hostNames, destinationHosts, hostByAgentId, entityIds, pids };
};

/** The timeline `host` fields and the iocs `affected_hosts` values of one analysis output. */
export const citedHostNames = (
  timeline: { events?: ReadonlyArray<{ host?: string }> } | undefined,
  iocs: { affected_hosts?: ReadonlyArray<{ value?: string }> } | undefined
): string[] => [
  ...(timeline?.events ?? []).map((event) => event.host).filter((host): host is string => !!host),
  ...(iocs?.affected_hosts ?? [])
    .map((host) => host.value)
    .filter((host): host is string => !!host),
];

export const endpointIdsOf = (proposal: InvestigationProposal): string[] => {
  const ids = (proposal.actionInput?.endpoint_ids ?? []) as unknown;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
};

export const processSelectorOf = (
  proposal: InvestigationProposal
): { pid?: number; entityId?: string } => {
  const parameters = (proposal.actionInput?.parameters ?? {}) as Record<string, unknown>;
  return {
    ...(typeof parameters.pid === 'number' ? { pid: parameters.pid } : {}),
    ...(typeof parameters.entity_id === 'string' ? { entityId: parameters.entity_id } : {}),
  };
};

export interface KnowledgeIndicatorSeed {
  readonly kiId: string;
  readonly type: string;
  readonly title: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly attributes: Record<string, string | number | boolean>;
}

/**
 * Writes a knowledge indicator straight into the managed `security-investigations` backing index,
 * the same document shape `context-engine.createKi` produces. The producer fields mirror the
 * AlertZero writers so sweeps selecting on `attributes.status` / `attributes.space_id` find it.
 */
export const seedKnowledgeIndicator = async (
  esClient: EsClient,
  seed: KnowledgeIndicatorSeed
): Promise<string> => {
  const now = new Date().toISOString();
  await esClient.index({
    index: AI_INDEX_KI_BACKING_INDEX,
    id: seed.kiId,
    refresh: 'wait_for',
    document: {
      '@timestamp': now,
      updated_at: now,
      id: seed.kiId,
      type: seed.type,
      title: seed.title,
      ...(seed.description ? { description: seed.description } : {}),
      tags: ['consumer:detection', 'status:pending', 'watch:test', ...(seed.tags ?? [])],
      attributes: {
        status: 'pending',
        producer: 'alertzero-e2e.seed.v1',
        watch_id: 'test',
        space_id: 'default',
        ...seed.attributes,
      },
    },
  });
  return seed.kiId;
};

export const readKnowledgeIndicator = async (
  esClient: EsClient,
  kiId: string
): Promise<{ found: boolean; status?: string }> => {
  try {
    const hit = await esClient.get({ index: AI_INDEX_KI_BACKING_INDEX, id: kiId });
    const source = hit._source as { attributes?: { status?: string } } | undefined;
    return { found: true, status: source?.attributes?.status };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) {
      return { found: false };
    }
    throw error;
  }
};

/**
 * Registers the `security-investigations` AI index record if the stack has none yet. Producers
 * get it lazily from `context-engine.createKi`; seeding straight into the backing index skips
 * that, and a sweep's `context-engine.updateKi` then fails with "AI index not found" before it
 * dispatches anything. Idempotent: an existing record answers 409.
 */
export const ensureInvestigationsAiIndex = async (api: AlertZeroApi): Promise<void> => {
  const result = await api.public('POST', AI_INDEX_URL, {
    body: {
      id: SECURITY_INVESTIGATIONS_AI_INDEX_ID,
      dest: { type: 'index', value: AI_INDEX_KI_BACKING_INDEX },
      automations: [],
      sources: [],
      traces: [],
    },
  });
  if (result.statusCode !== 409) {
    ok(result, 'register the security-investigations AI index');
  }
};

/**
 * Waits for the run-workflow execution the sweep dispatched for ONE indicator. A run execution
 * newer than a snapshot may belong to anyone sharing the workflow, so each new execution is read
 * back and matched on the `ki_id` input it was started with (or its `endpoint-analysis-<ki_id>`
 * concurrency key) — only the execution handed this run's indicator is returned.
 */
export const waitForEndpointAnalysisRun = async (
  api: AlertZeroApi,
  workflowId: string,
  knownExecutionIds: readonly string[],
  kiId: string,
  { timeoutMs }: { timeoutMs: number }
): Promise<string> =>
  pollUntil(
    `an execution of ${workflowId} started for indicator ${kiId}`,
    async () => {
      const newIds = (await listExecutionIds(api, workflowId)).filter(
        (id) => !knownExecutionIds.includes(id)
      );
      for (const id of newIds) {
        const execution = ok(
          await api.public<WorkflowExecution>('GET', `/api/workflows/executions/${id}`),
          `read execution ${id}`
        );
        if (
          execution.context?.inputs?.ki_id === kiId ||
          execution.concurrencyGroupKey === `endpoint-analysis-${kiId}`
        ) {
          return id;
        }
      }
      return undefined;
    },
    { timeoutMs }
  );
