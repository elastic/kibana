/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type {
  ProposalWithMetadata,
  ProposalsQuery,
} from '@kbn/agentic-investigations-plugin/common';
import { isAwaitingDecision } from '@kbn/agentic-investigations-plugin/common';
import {
  CLOSED_GROUP_KEY,
  type ProposalGroups,
  type ProposalItem,
  type GetProposalsListResponse,
} from '../../../common/proposals/list';

type ProposalsService = ReturnType<AgenticInvestigationsPluginStart['getProposalsService']>;

/** Conversation-derived fields merged onto a proposal on read. Both absent when unreadable. */
type ConversationDecoration = Pick<ProposalItem, 'conversationTitle' | 'conversationAgentId'>;

export class ConversationProposalsService {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly agentBuilder: AgentBuilderPluginStart,
    private readonly logger: Logger
  ) {}

  async list(
    query: ProposalsQuery,
    request: KibanaRequest,
    spaceId: string
  ): Promise<GetProposalsListResponse> {
    const { proposals, truncated } = await this.proposalsService.listByWindow(
      {
        decidedWithinHours: query.windowHours,
        // One live proposal per subject: a retried action leaves the failed
        // attempt behind pointing at its replacement.
        excludeSuperseded: true,
        excludeExpired: false,
      },
      spaceId
    );

    const conversations = await this.getConversations(
      proposals.map((p) => p.conversationId),
      request
    );

    const groups = this.groupProposals(proposals, conversations);
    const total = Object.values(groups).reduce((sum, items) => sum + items.length, 0);
    return { groups, total, truncated };
  }

  private groupProposals(
    proposals: ProposalWithMetadata[],
    conversations: Map<string, ConversationDecoration>
  ): ProposalGroups {
    const groups: ProposalGroups = { [CLOSED_GROUP_KEY]: [] };

    for (const proposal of proposals) {
      const item: ProposalItem = {
        ...proposal,
        ...conversations.get(proposal.conversationId),
      };

      // Anything not awaiting is closed, including a proposal that expired
      // unanswered — it carries no decision but nobody can act on it either.
      // `executing` counts as closed too: the human already approved and the
      // action is running, so re-offering it would invite a second decision.
      if (!isAwaitingDecision(proposal)) {
        groups[CLOSED_GROUP_KEY].push(item);
      } else if (proposal.category) {
        if (!groups[proposal.category]) {
          groups[proposal.category] = [];
        }
        groups[proposal.category].push(item);
      }
    }

    groups[CLOSED_GROUP_KEY].sort((a, b) => {
      if (!a.decidedAt || !b.decidedAt) return 0;
      return b.decidedAt.localeCompare(a.decidedAt);
    });

    return groups;
  }

  private async getConversations(
    conversationIds: string[],
    request: KibanaRequest
  ): Promise<Map<string, ConversationDecoration>> {
    const uniqueIds = [...new Set(conversationIds)];
    const client = await this.agentBuilder.conversations.getScopedClient({ request });

    // Decoration only: if the bulk read fails, still return the proposals list without it.
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
}
