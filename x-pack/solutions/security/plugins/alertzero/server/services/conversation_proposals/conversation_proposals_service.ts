/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ConversationWithPermissions } from '@kbn/agent-builder-common';
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

export class ConversationProposalsService {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly agentBuilder: AgentBuilderPluginStart,
    private readonly logger: Logger
  ) {}

  async get(conversationId: string, request: KibanaRequest): Promise<ConversationWithPermissions> {
    const client = await this.agentBuilder.conversations.getScopedClient({ request });
    return client.get(conversationId);
  }

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
