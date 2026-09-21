/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { ProposalWithMetadata } from '@kbn/agentic-investigations-plugin/common';
import type { ProposalItem, ProposalsPageResponse } from '../../../common/proposals/list';

type ProposalsService = ReturnType<AgenticInvestigationsPluginStart['getProposalsService']>;

/** Conversation-derived fields merged onto a proposal on read. Both absent when unreadable. */
type ConversationDecoration = Pick<ProposalItem, 'conversationTitle' | 'conversationAgentId'>;

/** Fixed window for the closed-proposals queue: decisions older than this are not shown. */
const CLOSED_DECIDED_WITHIN_HOURS = 72;

export class ConversationProposalsService {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly agentBuilder: AgentBuilderPluginStart,
    private readonly logger: Logger
  ) {}

  /** Returns pending proposals for a single action category, newest first. */
  async listByCategory(
    category: string,
    request: KibanaRequest,
    spaceId: string,
    { size, from }: { size: number; from: number }
  ): Promise<ProposalsPageResponse> {
    const { proposals, total } = await this.proposalsService.list(
      { category, status: 'pending', excludeSuperseded: true, excludeExpired: false, size, from },
      spaceId,
      [{ createdAt: { order: 'desc' as const } }]
    );

    const conversations = await this.fetchConversations(
      proposals.map((p) => p.conversationId),
      request
    );

    return { proposals: this.enrichProposals(proposals, conversations), total };
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
        excludeSuperseded: true,
        excludeExpired: false,
        size,
        from,
      },
      spaceId,
      [{ decidedAt: { order: 'desc' as const } }, { createdAt: { order: 'desc' as const } }]
    );

    const conversations = await this.fetchConversations(
      proposals.map((p) => p.conversationId),
      request
    );

    return { proposals: this.enrichProposals(proposals, conversations), total };
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
        [...conversations].map(([id, { title, agent_id: agentId }]) => [
          id,
          {
            ...(title ? { conversationTitle: title } : {}),
            ...(agentId ? { conversationAgentId: agentId } : {}),
          },
        ])
      );
    } catch (err) {
      this.logger.debug(`Could not resolve conversations: ${err}`);
      return new Map();
    }
  }

  private enrichProposals(
    proposals: ProposalWithMetadata[],
    conversations: Map<string, ConversationDecoration>
  ): ProposalItem[] {
    return proposals.map((proposal) => ({
      ...proposal,
      ...conversations.get(proposal.conversationId),
    }));
  }
}
