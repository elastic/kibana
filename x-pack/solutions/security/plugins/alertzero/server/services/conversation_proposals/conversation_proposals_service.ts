/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { ProposalActivityQuery } from '@kbn/agentic-investigations-plugin/common';
import type { GetProposalActivityResponse } from '../../../common/proposals/activity';
import { createConversationTitlesClient } from '../conversations/conversation_titles_client';
import { groupProposalActivity } from '../../routes/proposals/group_proposal_activity';

type ProposalsService = ReturnType<AgenticInvestigationsPluginStart['getProposalsService']>;

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

    const titles = await createConversationTitlesClient({
      agentBuilder: this.agentBuilder,
      request,
      logger: this.logger,
    }).getTitles(proposals.map((p) => p.conversationId));

    return { groups: groupProposalActivity(proposals, titles), total, truncated };
  }
}
