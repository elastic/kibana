/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  isConversationNotFoundError,
  type MetadataFieldValue,
} from '@kbn/agent-builder-common';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { ProposalWithMetadata } from '@kbn/agentic-investigations-plugin/common';
import type { Investigation } from '@kbn/agentic-investigations-common';
import type { ProposalItem, ProposalsPageResponse } from '../../../common/proposals/list';

type ProposalsService = ReturnType<AgenticInvestigationsPluginStart['getProposalsService']>;

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
