/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { EsClient, KibanaRole } from '@kbn/scout-security';
import type { KbnClient } from '@kbn/kbn-client';
import { deleteConversationProposals, type SpacesService } from './onboarding';
import {
  ok,
  pollUntil,
  spaceUrl,
  type AlertZeroApi,
  type ApiResult,
  type Headers,
} from './helpers';

/** Agent Builder public API version (the conversation routes are versioned, not internal). */
const AGENT_BUILDER_API_VERSION = '2023-10-31';
const PUBLIC_HEADERS: Headers = { 'elastic-api-version': AGENT_BUILDER_API_VERSION };

const INVESTIGATION_TEMPLATE_ID = 'investigation';
const CREATE_PROPOSAL_WORKFLOW_ID = 'system-create-proposal';
const PROPOSALS_INTERNAL_URL = '/internal/proposals';
const PROPOSAL_ATTACHMENT_TYPE = 'platform.proposal';
const ALERTS_ATTACHMENT_TYPE = 'security.alerts';

const SEED_TIMEOUT_MS = 90_000;

export interface SeededInvestigation {
  conversationId: string;
  title: string;
  proposalId: string;
  /** Stops the proposal gate workflow, deletes its proposal docs, then the conversation (404-tolerant). */
  cleanup: () => Promise<void>;
}

interface ProposalListBody {
  proposals?: Array<{ id: string; conversationId: string; workflowExecutionId?: string }>;
}

interface ConversationBody {
  attachments?: Array<{ type: string; origin?: string; id?: string }>;
}

const agentBuilder = (
  api: AlertZeroApi,
  method: 'GET' | 'POST' | 'DELETE',
  spaceId: string,
  path: string,
  body?: unknown
): Promise<ApiResult<unknown>> => api.raw(method, spaceUrl(path, spaceId), PUBLIC_HEADERS, body);

const listProposals = async (
  api: AlertZeroApi,
  spaceId: string,
  conversationId: string
): Promise<NonNullable<ProposalListBody['proposals']>> => {
  const result = await api.internal<ProposalListBody>(
    'GET',
    spaceUrl(`${PROPOSALS_INTERNAL_URL}?conversationId=${conversationId}&size=100`, spaceId)
  );
  return ok(result, 'list proposals').proposals ?? [];
};

/** Seeds an open investigation with a pending proposal card; no model or agent run is needed. */
export const seedInvestigation = async (
  api: AlertZeroApi,
  spaceId: string,
  {
    esClient,
    title,
    origin = 'agent_builder',
  }: { esClient: EsClient; title: string; origin?: 'alertzero' | 'agent_builder' }
): Promise<SeededInvestigation> => {
  const conversationId = randomUUID();

  ok(
    await agentBuilder(api, 'POST', spaceId, '/api/agent_builder/conversations', {
      conversation_id: conversationId,
      agent_id: agentBuilderDefaultAgentId,
      title,
      template_id: INVESTIGATION_TEMPLATE_ID,
      access_control: { access_mode: 'public' },
      metadata: { status: 'open' },
    }),
    'create investigation conversation'
  );

  const cleanup = async (): Promise<void> => {
    const proposals = await listProposals(api, spaceId, conversationId).catch(() => []);
    for (const { workflowExecutionId } of proposals) {
      if (workflowExecutionId) {
        // 404 = the execution already ended; nothing to stop.
        await api.public(
          'POST',
          spaceUrl(`/api/workflows/executions/${workflowExecutionId}/cancel`, spaceId)
        );
      }
    }
    // The proposal index is shared and outlives the space, so the docs are removed explicitly.
    try {
      await deleteConversationProposals(esClient, spaceId, conversationId);
    } finally {
      await agentBuilder(
        api,
        'DELETE',
        spaceId,
        `/api/agent_builder/conversations/${conversationId}`
      );
    }
  };

  try {
    ok(
      await api.public(
        'POST',
        spaceUrl(`/api/workflows/workflow/${CREATE_PROPOSAL_WORKFLOW_ID}/run`, spaceId),
        {
          body: {
            inputs: {
              conversationId,
              title,
              comment: 'Seeded proposal for the permission specs.',
              origin,
              confidence: 'medium',
              // A to-do renders a single "I've applied" button; any other category gets Approve and Decline.
              category: 'respond',
            },
          },
        }
      ),
      'run the create-proposal workflow'
    );

    const proposalId = await pollUntil(
      `proposal for ${conversationId}`,
      async () => (await listProposals(api, spaceId, conversationId))[0]?.id,
      { timeoutMs: SEED_TIMEOUT_MS }
    );
    // The gate attaches the card after it indexes the proposal; the chat renders from the attachment.
    await pollUntil(
      `proposal card attachment on ${conversationId}`,
      async () => {
        const { attachments = [] } = ok(
          await agentBuilder(
            api,
            'GET',
            spaceId,
            `/api/agent_builder/conversations/${conversationId}`
          ),
          'read conversation'
        ) as ConversationBody;
        return attachments.some(({ type }) => type === PROPOSAL_ATTACHMENT_TYPE) ? true : undefined;
      },
      { timeoutMs: SEED_TIMEOUT_MS }
    );

    return { conversationId, title, proposalId, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
};

/** Two or more ids render the grouped "N alerts" link row; a single id renders a different row. */
export const attachAlerts = async (
  api: AlertZeroApi,
  spaceId: string,
  conversationId: string,
  alertIds: string[]
): Promise<void> => {
  ok(
    await agentBuilder(
      api,
      'POST',
      spaceId,
      `/api/agent_builder/conversations/${conversationId}/attachments`,
      {
        id: randomUUID(),
        type: ALERTS_ATTACHMENT_TYPE,
        origin: 'permission-spec',
        data: { alertIds },
        hidden: false,
      }
    ),
    'attach alerts'
  );
};

/** Elasticsearch access broad enough that only Kibana feature privileges gate the specs. */
const BROAD_ES = {
  cluster: ['all'],
  indices: [{ names: ['*'], privileges: ['all' as const] }],
};

/** The chat page errors without `actions` read and `monitor_inference` on top of Agent Builder. */
const CHAT_ES = { cluster: ['monitor_inference'], indices: [] };

const roleOf = (
  feature: Record<string, string[]>,
  elasticsearch: KibanaRole['elasticsearch']
): KibanaRole => ({
  elasticsearch,
  kibana: [{ base: [], feature, spaces: ['*'] }],
});

const CHAT_FEATURES = {
  alertzero: ['all'],
  agentBuilder: ['all'],
  actions: ['read'],
};

/** Proposed Actions Read: can see cards but holds no decide privilege. */
export const PROPOSALS_READ_ROLE: KibanaRole = roleOf(
  { ...CHAT_FEATURES, proposals: ['read'] },
  CHAT_ES
);

/** Control for the above: Proposed Actions All grants decide. */
export const PROPOSALS_ALL_ROLE: KibanaRole = roleOf(
  { ...CHAT_FEATURES, proposals: ['all'] },
  CHAT_ES
);

const SECURITY_ALL = {
  alertzero: ['all'],
  agentBuilder: ['all'],
  proposals: ['all'],
  agenticInvestigations: ['all'],
  siemV5: ['all'],
  securitySolutionRulesV4: ['all'],
  securitySolutionCasesV3: ['all'],
  securitySolutionTimeline: ['all'],
  securitySolutionNotes: ['all'],
  securitySolutionAttackDiscovery: ['all'],
  securitySolutionAssistant: ['all'],
};

/** Every Security feature at All except Alerts, which is absent. */
export const ALERTS_NONE_ROLE: KibanaRole = roleOf(SECURITY_ALL, BROAD_ES);

/** Control for the above: identical, plus Alerts at All. */
export const ALERTS_ALL_ROLE: KibanaRole = roleOf(
  { ...SECURITY_ALL, securitySolutionAlertsV1: ['all'] },
  BROAD_ES
);

const QUEUE_FEATURES = {
  alertzero: ['all'],
  proposals: ['read'],
  agentBuilder: ['read'],
};

/** AlertZero All with Proposed Actions and Agent Builder Read only: no Agentic Investigations. */
export const ALERTZERO_ONLY_ROLE: KibanaRole = roleOf(QUEUE_FEATURES, { cluster: [] });

/** Control for the above: adds Agentic Investigations All with Manage escalations. */
export const ESCALATIONS_ROLE: KibanaRole = roleOf(
  { ...QUEUE_FEATURES, agenticInvestigations: ['all', 'escalations_all'] },
  { cluster: [] }
);

/** AlertZero routes exist only in `security`-solution spaces; the scout spaces service makes classic ones. */
export const withSecuritySolution = (
  kbnClient: KbnClient,
  spaces: SpacesService
): SpacesService => ({
  create: ({ id, name }) =>
    kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id, name, solution: 'security' },
      retries: 1,
    }),
  delete: spaces.delete,
});
