/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { isConversationNotFoundError } from '@kbn/agent-builder-common';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type {
  ProposalWithMetadata,
  ProposalsQuery,
} from '@kbn/agentic-investigations-plugin/common';
import { isAwaitingDecision } from '@kbn/agentic-investigations-plugin/common';
import type { Investigation } from '@kbn/alertzero-common';
import {
  CLOSED_GROUP_KEY,
  type ProposalGroups,
  type ProposalItem,
  type GetProposalsListResponse,
} from '../../../common/proposals/list';

type ProposalsService = ReturnType<AgenticInvestigationsPluginStart['getProposalsService']>;

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

    const titles = await this.getTitles(
      proposals.map((p) => p.conversationId),
      request
    );

    const groups = this.groupProposals(proposals, titles);
    const total = Object.values(groups).reduce((sum, items) => sum + items.length, 0);
    return { groups, total, truncated };
  }

  private groupProposals(
    proposals: ProposalWithMetadata[],
    titles: Map<string, string>
  ): ProposalGroups {
    const groups: ProposalGroups = { [CLOSED_GROUP_KEY]: [] };

    for (const proposal of proposals) {
      const item: ProposalItem = {
        ...proposal,
        ...(titles.has(proposal.conversationId)
          ? { conversationTitle: titles.get(proposal.conversationId) }
          : {}),
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

  async getInvestigation(
    conversationId: string,
    request: KibanaRequest,
    spaceId: string
  ): Promise<Investigation | null> {
    const client = await this.agentBuilder.conversations.getScopedClient({ request });

    let conversation: Awaited<ReturnType<typeof client.get>>;
    try {
      conversation = await client.get(conversationId);
    } catch (err) {
      if (isConversationNotFoundError(err)) {
        return null;
      }
      throw err;
    }

    const { total: pendingProposalCount } = await this.proposalsService.list(
      {
        conversationId,
        status: 'pending',
        size: 1,
        from: 0,
        excludeSuperseded: false,
        excludeExpired: false,
      },
      spaceId
    );

    return {
      id: conversationId,
      template_id: 'investigation',
      title: conversation.title,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      // No workflow metadata is stored on the conversation; fabricated like proposalToInvestigation.
      watch_id: '',
      watch_execution_id: '',
      pendingProposalCount,
      events: [],
    };
  }

  private async getTitles(
    conversationIds: string[],
    request: KibanaRequest
  ): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(conversationIds)];
    const client = await this.agentBuilder.conversations.getScopedClient({ request });

    // Titles are decoration: if the bulk read fails, still return the proposals list without them.
    try {
      const conversations = await client.bulkGet(uniqueIds);
      return new Map(
        [...conversations].flatMap(([id, { title }]) => (title ? [[id, title] as const] : []))
      );
    } catch (err) {
      this.logger.debug(`Could not resolve conversation titles: ${err}`);
      return new Map();
    }
  }
}
