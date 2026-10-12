/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { MetadataFieldValue } from '@kbn/agent-builder-common';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { TEMPLATE_ID_INVESTIGATION } from '@kbn/alertzero-common';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../common/proposals/origin';
import type {
  InvestigationQueueItem,
  InvestigationsPageParams,
  InvestigationsPageResponse,
} from '../../../common/investigations/queue';
import { MAX_QUEUE_REACH } from '../../../common/investigations/queue';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;
type GetImpactClient = AgenticInvestigationsPluginStart['getImpactClient'];
type ConversationsClient = Awaited<
  ReturnType<AgentBuilderPluginStart['conversations']['getScopedClient']>
>;
type QueueConversation = Awaited<ReturnType<ConversationsClient['bulkGet']>> extends Map<
  string,
  infer Conversation
>
  ? Conversation
  : never;

/** Fixed window for the closed queue: investigations last updated before this are not shown. */
const CLOSED_WITHIN_HOURS = 72;

const HOUR_MS = 60 * 60 * 1000;

/**
 * Metadata is only deserialized to a `TEXT_ARRAY`'s declared `string[]` when the
 * conversation's template resolves; otherwise it stays in storage form, where a
 * single entry is a bare string.
 */
const readAssignees = (value: MetadataFieldValue | undefined): string[] => {
  if (Array.isArray(value)) return value;
  return typeof value === 'string' ? [value] : [];
};

const readString = (value: MetadataFieldValue | undefined): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

const toQueueItem = (
  conversation: QueueConversation,
  entityIds: Map<string, string[]>
): InvestigationQueueItem => {
  const { id, title, agent_id: agentId, metadata } = conversation;
  const ids = entityIds.get(id);
  const closeReason = readString(metadata?.close_reason);
  const verdict = readString(metadata?.verdict);
  const description = readString(metadata?.description);
  return {
    id,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(agentId ? { agentId } : {}),
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    status: metadata?.status === 'closed' ? 'closed' : 'open',
    ...(closeReason ? { closeReason } : {}),
    ...(verdict ? { verdict } : {}),
    assignees: readAssignees(metadata?.assignees),
    ...(ids && ids.length > 0 ? { entityIds: ids } : {}),
  };
};

export class InvestigationQueueService {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly agentBuilder: AgentBuilderPluginStart,
    private readonly logger: Logger,
    private readonly getImpactClient: GetImpactClient
  ) {}

  /**
   * Open investigations holding a proposal in the category, pending or decided, ordered by
   * their newest such proposal. Proposals and conversations live in different indices, so
   * the proposals are grouped first and the conversations are read (and
   * access-checked) second.
   */
  async listOpenByCategory(
    category: string,
    request: KibanaRequest,
    spaceId: string,
    { size, from }: InvestigationsPageParams
  ): Promise<InvestigationsPageResponse> {
    const groups = await this.proposalsService.listConversationsByCategory(
      { category, origin: ALERTZERO_PROPOSAL_ORIGIN, limit: MAX_QUEUE_REACH },
      spaceId,
      request
    );
    if (groups.length === 0) return { investigations: [], total: 0 };

    const client = await this.agentBuilder.conversations.getScopedClient({ request });
    const conversations = await client.bulkGet(groups.map(({ conversationId }) => conversationId));

    const open = groups.flatMap((group) => {
      const conversation = conversations.get(group.conversationId);
      if (
        !conversation ||
        conversation.template_id !== TEMPLATE_ID_INVESTIGATION ||
        conversation.metadata?.status === 'closed'
      ) {
        return [];
      }
      return [{ group, conversation }];
    });

    const page = open.slice(from, from + size);
    const entityIds = await this.getEntityIds(
      page.map(({ conversation }) => conversation.id),
      request
    );

    return {
      investigations: page.map(({ group, conversation }) => ({
        ...toQueueItem(conversation, entityIds),
        category,
        newestProposalAt: group.newestProposalAt,
        pendingProposalCount: group.pendingCount,
        ...(group.lead ? { leadProposal: group.lead } : {}),
      })),
      total: open.length,
    };
  }

  /**
   * Investigations closed in the last 72 h that received at least one AlertZero proposal,
   * most recently updated first. Investigations carry no closed-at timestamp, so
   * `updated_at` stands in for it, and a later write to a closed investigation brings it
   * back into the window. Investigations no proposal was ever raised on, such as the
   * automated triage ones, are not part of this queue.
   */
  async listClosed(
    request: KibanaRequest,
    spaceId: string,
    { size, from }: InvestigationsPageParams
  ): Promise<InvestigationsPageResponse> {
    const client = await this.agentBuilder.conversations.getScopedClient({ request });
    const since = new Date(Date.now() - CLOSED_WITHIN_HOURS * HOUR_MS).toISOString();
    const { results } = await client.search({
      filter: `template_id: "${TEMPLATE_ID_INVESTIGATION}" AND metadata.status: "closed" AND updated_at >= "${since}"`,
      sort: { field: 'updated_at', order: 'desc' },
      page: 1,
      perPage: MAX_QUEUE_REACH,
    });

    const withProposals = await this.proposalsService.findConversationsWithProposals(
      { conversationIds: results.map(({ id }) => id), origin: ALERTZERO_PROPOSAL_ORIGIN },
      spaceId
    );
    const closed = results.filter(({ id }) => withProposals.has(id));

    const page = closed.slice(from, from + size);
    const entityIds = await this.getEntityIds(
      page.map(({ id }) => id),
      request
    );

    return {
      investigations: page.map((conversation) => toQueueItem(conversation, entityIds)),
      total: closed.length,
    };
  }

  /**
   * Impact lives in its own index, keyed by conversationId. The client checks the
   * investigations manage privilege and derives the space from the request. Failure
   * here omits the field — the queue is still usable without pills.
   */
  private async getEntityIds(
    conversationIds: string[],
    request: KibanaRequest
  ): Promise<Map<string, string[]>> {
    if (conversationIds.length === 0) return new Map();

    try {
      return await this.getImpactClient(request).getEntityIdsByConversationId(conversationIds);
    } catch (err) {
      this.logger.debug(`Could not resolve investigation impact: ${err}`);
      return new Map();
    }
  }
}
