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
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../common/proposals/origin';
import type { ProposalItem, ProposalsPageResponse } from '../../../common/proposals/list';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;
type GetImpactClient = AgenticInvestigationsPluginStart['getImpactClient'];

/** Conversation-derived fields merged onto a proposal on read. Absent when unreadable. */
type ConversationDecoration = Pick<
  ProposalItem,
  'conversationTitle' | 'conversationAgentId' | 'conversationAssignees'
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

/** Fixed window for the closed-proposals queue: decisions older than this are not shown. */
const CLOSED_DECIDED_WITHIN_HOURS = 72;

/**
 * Breaks every tie the timestamps leave, so a row cannot move between two offset
 * pages and be shown twice or skipped. Unique per live proposal: `create` roots a
 * chain at its own id, `revise` numbers it, and the one other pair that shares both
 * — an original and its clone — never appear together, since both queues exclude
 * superseded records.
 */
const TIEBREAKER: SortCombinations[] = [
  { rootProposalId: { order: 'asc' } },
  { revision: { order: 'asc' } },
];

export class ConversationProposalsService {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly agentBuilder: AgentBuilderPluginStart,
    private readonly logger: Logger,
    private readonly getImpactClient: GetImpactClient
  ) {}

  /** Returns pending proposals for a single action category, newest first. */
  async listByCategory(
    category: string,
    request: KibanaRequest,
    spaceId: string,
    { size, from }: { size: number; from: number }
  ): Promise<ProposalsPageResponse> {
    const { proposals, total } = await this.proposalsService.list(
      {
        category,
        origin: ALERTZERO_PROPOSAL_ORIGIN,
        status: 'pending',
        excludeSuperseded: true,
        excludeExpired: false,
        size,
        from,
      },
      spaceId,
      [{ createdAt: { order: 'desc' as const } }, ...TIEBREAKER]
    );

    return { proposals: await this.decorate(proposals, request), total };
  }

  /** Proposals that stopped awaiting a human in the last 72 h, newest decision first. */
  async listClosed(
    request: KibanaRequest,
    spaceId: string,
    { size, from }: { size: number; from: number }
  ): Promise<ProposalsPageResponse> {
    const { proposals, total } = await this.proposalsService.list(
      {
        decidedWithinHours: CLOSED_DECIDED_WITHIN_HOURS,
        // The index is shared with every other solution's proposals, and only
        // this filter keeps theirs out of an AlertZero queue.
        origin: ALERTZERO_PROPOSAL_ORIGIN,
        excludeSuperseded: true,
        excludeExpired: false,
        size,
        from,
      },
      spaceId,
      [
        { decidedAt: { order: 'desc' as const } },
        { createdAt: { order: 'desc' as const } },
        ...TIEBREAKER,
      ]
    );

    return { proposals: await this.decorate(proposals, request), total };
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
            conversationAssignees: readAssignees(metadata?.assignees),
          },
        ])
      );
    } catch (err) {
      this.logger.debug(`Could not resolve conversations: ${err}`);
      return new Map();
    }
  }

  /**
   * Second pass after the proposal list. Impact lives in its own index, keyed
   * by conversationId. The client checks `read_impact` and derives the space
   * from the request. Failure here omits the field the same way a missing
   * title does — the queue is still usable without pills.
   */
  private async getEntityIds(
    conversationIds: string[],
    request: KibanaRequest
  ): Promise<Map<string, string[]>> {
    const uniqueIds = [...new Set(conversationIds)];
    if (uniqueIds.length === 0) return new Map();

    try {
      const impacts = await this.getImpactClient(request).listByConversationIds(uniqueIds);
      return new Map(
        impacts.map((impact) => [impact.conversationId, impact.entities.map((entity) => entity.id)])
      );
    } catch (err) {
      this.logger.debug(`Could not resolve investigation impact: ${err}`);
      return new Map();
    }
  }

  private async decorate(
    proposals: ProposalWithMetadata[],
    request: KibanaRequest
  ): Promise<ProposalItem[]> {
    const conversationIds = proposals.map((proposal) => proposal.conversationId);
    const [conversations, entityIds] = await Promise.all([
      this.fetchConversations(conversationIds, request),
      this.getEntityIds(conversationIds, request),
    ]);
    return this.enrichProposals(proposals, conversations, entityIds);
  }

  private enrichProposals(
    proposals: ProposalWithMetadata[],
    conversations: Map<string, ConversationDecoration>,
    entityIds: Map<string, string[]>
  ): ProposalItem[] {
    return proposals.map((proposal) => {
      const conversation = conversations.get(proposal.conversationId);
      const ids = entityIds.get(proposal.conversationId);
      return {
        ...proposal,
        ...conversation,
        conversationAssignees: conversation?.conversationAssignees ?? [],
        ...(ids && ids.length > 0 ? { entityIds: ids } : {}),
      };
    });
  }
}
