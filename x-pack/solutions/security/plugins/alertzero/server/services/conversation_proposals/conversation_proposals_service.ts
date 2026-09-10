/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO(elastic/search-team#15972): replace N individual get() calls with a bulk API once it lands.

import { asyncMapWithLimit } from '@kbn/std';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { ProposalActivityQuery } from '@kbn/agentic-investigations-plugin/common';
import type { GetProposalActivityResponse } from '../../../common/proposals/activity';
import { groupProposalActivity } from './group_proposal_activity';

type ProposalsService = ReturnType<AgenticInvestigationsPluginStart['getProposalsService']>;

const CONCURRENCY_LIMIT = 10;

export class ConversationProposalsService {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly agentBuilder: AgentBuilderPluginStart,
    private readonly logger: Logger
  ) {}

  async list(
    query: ProposalActivityQuery,
    request: KibanaRequest,
    spaceId: string
  ): Promise<GetProposalActivityResponse> {
    const { proposals, total, truncated } = await this.proposalsService.listActivity(
      query,
      spaceId
    );

    const titles = await this.getTitles(
      proposals.map((p) => p.conversationId),
      request
    );

    return { groups: groupProposalActivity(proposals, titles), total, truncated };
  }

  private async getTitles(
    conversationIds: string[],
    request: KibanaRequest
  ): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(conversationIds)];
    const client = await this.agentBuilder.conversations.getScopedClient({ request });

    const pairs = await asyncMapWithLimit(uniqueIds, CONCURRENCY_LIMIT, async (id) => {
      try {
        const conversation = await client.get(id);
        return [id, conversation.title] as [string, string];
      } catch (err) {
        this.logger.debug(`Could not resolve title for conversation [${id}]: ${err}`);
        return undefined;
      }
    });

    const map = new Map<string, string>();
    for (const pair of pairs) {
      if (pair) map.set(pair[0], pair[1]);
    }
    return map;
  }
}
