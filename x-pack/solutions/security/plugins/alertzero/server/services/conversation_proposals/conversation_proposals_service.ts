/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { MetadataFieldValue } from '@kbn/agent-builder-common';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { OPEN_PROPOSAL_STATUSES, SETTLED_PROPOSAL_STATUSES } from '@kbn/proposals-common';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../common/proposals/origin';
import {
  CLOSED_DECIDED_WITHIN_HOURS,
  type ProposalItem,
  type ProposalsPageParams,
  type ProposalsPageResponse,
} from '../../../common/proposals/list';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;
type GetImpactClient = AgenticInvestigationsPluginStart['getImpactClient'];

/** Conversation-derived fields merged onto a proposal on read. Absent when unreadable. */
type ConversationDecoration = Pick<
  ProposalItem,
  'conversationTitle' | 'conversationAgentId' | 'conversationStatus' | 'conversationAssignees'
>;

/**
 * Metadata is only deserialized to a `TEXT_ARRAY`'s declared `string[]` when the
 * conversation's template resolves; otherwise it stays in storage form, where a
 * single entry is a bare string.
 */
const readAssignees = (value: MetadataFieldValue | undefined): string[] => {
  if (Array.isArray(value)) return value;
  return typeof value === 'string' ? [value] : [];
};

const readStatus = (value: MetadataFieldValue | undefined): 'open' | 'closed' | undefined =>
  value === 'open' || value === 'closed' ? value : undefined;

/**
 * Breaks every tie the timestamps leave, so a row cannot move between two offset
 * pages and be shown twice or skipped. Unique per live proposal: `create` roots a
 * chain at its own id, `revise` numbers it.
 */
const TIEBREAKER: SortCombinations[] = [
  { rootProposalId: { order: 'asc' } },
  { revision: { order: 'asc' } },
];

const EMPTY_PAGE: ProposalsPageResponse = { proposals: [], total: 0 };

export class ConversationProposalsService {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly agentBuilder: AgentBuilderPluginStart,
    private readonly logger: Logger,
    private readonly getImpactClient: GetImpactClient
  ) {}

  /** Returns the open proposals (pending or executing) of one category, newest first. */
  async listByCategory(
    category: string,
    request: KibanaRequest,
    spaceId: string,
    { size, from, entity }: ProposalsPageParams
  ): Promise<ProposalsPageResponse> {
    const entityFilter = await this.resolveEntityFilter(entity, request);
    if (entityFilter.matchesNothing) return EMPTY_PAGE;

    const { proposals, total } = await this.proposalsService.list(
      {
        ...entityFilter.filter,
        category,
        origin: ALERTZERO_PROPOSAL_ORIGIN,
        // The proposal stays here while its action runs. It leaves when the action settles.
        statuses: OPEN_PROPOSAL_STATUSES,
        excludeSuperseded: true,
        excludeExpired: false,
        size,
        from,
      },
      spaceId,
      request,
      [{ createdAt: { order: 'desc' as const } }, ...TIEBREAKER]
    );

    return { proposals: await this.decorate(proposals, request), total };
  }

  /** Returns the proposals that settled in the last 72 hours, newest decision first. */
  async listClosed(
    request: KibanaRequest,
    spaceId: string,
    { size, from, entity }: ProposalsPageParams
  ): Promise<ProposalsPageResponse> {
    const entityFilter = await this.resolveEntityFilter(entity, request);
    if (entityFilter.matchesNothing) return EMPTY_PAGE;

    const { proposals, total } = await this.proposalsService.list(
      {
        ...entityFilter.filter,
        decidedWithinHours: CLOSED_DECIDED_WITHIN_HOURS,
        statuses: SETTLED_PROPOSAL_STATUSES,
        // The index is shared with every other solution's proposals, and only
        // this filter keeps theirs out of an AlertZero queue.
        origin: ALERTZERO_PROPOSAL_ORIGIN,
        // A failed attempt that a retry replaced is not shown: the retry carries its error
        // as `previousExecutionError`. Earlier revisions go too, since settling one as
        // `expired` stamps `decidedAt`, so the recency window alone would let it in.
        excludeSuperseded: true,
        excludeExpired: false,
        size,
        from,
      },
      spaceId,
      request,
      [
        { decidedAt: { order: 'desc' as const } },
        { createdAt: { order: 'desc' as const } },
        ...TIEBREAKER,
      ]
    );

    return { proposals: await this.decorate(proposals, request), total };
  }

  /**
   * Impact lives in its own index, so an entity filter becomes the conversations that carry the
   * entity. None means nothing can match, which saves the proposals query.
   */
  private async resolveEntityFilter(
    entity: string | undefined,
    request: KibanaRequest
  ): Promise<{ matchesNothing: boolean; filter: { conversationIds?: string[] } }> {
    if (entity === undefined) return { matchesNothing: false, filter: {} };

    const conversationIds = await this.getImpactClient(request).searchConversationIdsByEntityId(
      entity
    );
    return { matchesNothing: conversationIds.length === 0, filter: { conversationIds } };
  }

  /** Returns an empty map if the read fails: enrichment is decoration, not load-bearing. */
  private async fetchConversations(
    conversationIds: string[],
    request: KibanaRequest
  ): Promise<Map<string, ConversationDecoration>> {
    const uniqueIds = [...new Set(conversationIds)];
    if (uniqueIds.length === 0) return new Map();

    const client = await this.agentBuilder.conversations.getScopedClient({ request });

    try {
      const conversations = await client.bulkGet(uniqueIds);
      return new Map(
        [...conversations].map(([id, { title, agent_id: agentId, metadata }]) => [
          id,
          {
            ...(title ? { conversationTitle: title } : {}),
            ...(agentId ? { conversationAgentId: agentId } : {}),
            ...(readStatus(metadata?.status)
              ? { conversationStatus: readStatus(metadata?.status) }
              : {}),
            conversationAssignees: readAssignees(metadata?.assignees),
          },
        ])
      );
    } catch (err) {
      this.logger.debug(`Could not resolve conversations: ${err}`);
      return new Map();
    }
  }

  private async decorate(
    proposals: ProposalWithMetadata[],
    request: KibanaRequest
  ): Promise<ProposalItem[]> {
    const conversations = await this.fetchConversations(
      proposals.map((proposal) => proposal.conversationId),
      request
    );
    return this.enrichProposals(proposals, conversations);
  }

  private enrichProposals(
    proposals: ProposalWithMetadata[],
    conversations: Map<string, ConversationDecoration>
  ): ProposalItem[] {
    return proposals.map((proposal) => {
      const conversation = conversations.get(proposal.conversationId);
      return {
        ...proposal,
        ...conversation,
        conversationAssignees: conversation?.conversationAssignees ?? [],
      };
    });
  }
}
