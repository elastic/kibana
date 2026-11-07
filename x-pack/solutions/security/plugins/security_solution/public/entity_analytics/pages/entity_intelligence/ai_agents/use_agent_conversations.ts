/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../common/lib/kibana';
import {
  AGENT_CONVERSATION_LIMIT,
  buildAgentConversationDetail,
  getConversationReferenceAliases,
  projectAgentConversations,
} from './agent_conversations';
import type {
  AgentConversationDetail,
  AgentConversationListResponse,
  AgentConversationResponse,
  AgentConversationSummary,
} from './agent_conversations';
import type { AgentInvocation, AgentToolCall } from './types';

export interface AgentConversationsResult {
  conversations: AgentConversationSummary[];
  isLoading: boolean;
  unavailable: boolean;
  partial: boolean;
}

export const useAgentConversations = (
  spaceId: string | undefined,
  agentId: string
): AgentConversationsResult => {
  const { http } = useKibana().services;
  const enabled = Boolean(spaceId);
  const query = useQuery(
    ['entityIntelligenceAgentConversations', spaceId, agentId],
    async ({ signal }) => {
      const response = await http.get<AgentConversationListResponse>(
        '/api/agent_builder/conversations',
        {
          version: '2023-10-31',
          query: {
            agent_id: agentId,
            page: 1,
            per_page: AGENT_CONVERSATION_LIMIT,
            sort_order: 'desc',
          },
          signal,
        }
      );
      return {
        conversations: projectAgentConversations(response, agentId),
        partial: response.pagination.total > response.results.length,
      };
    },
    { enabled, retry: false, refetchOnWindowFocus: false }
  );
  return {
    conversations:
      !enabled || query.isError || query.isFetching ? [] : query.data?.conversations ?? [],
    isLoading: enabled && query.isLoading,
    unavailable: query.isError,
    partial: !query.isError && (query.data?.partial ?? false),
  };
};

export interface AgentConversationContentResult {
  detail?: AgentConversationDetail;
  isLoading: boolean;
  unavailable: boolean;
}

/** Fetches content through conversation ACLs only while its inspector is mounted, without retaining raw responses. */
export const useAgentConversationContent = (
  spaceId: string | undefined,
  agentId: string,
  conversationId: string | undefined,
  invocation: AgentInvocation,
  call?: AgentToolCall
): AgentConversationContentResult => {
  const { http } = useKibana().services;
  const enabled = Boolean(spaceId && conversationId);
  const query = useQuery<AgentConversationDetail>(
    [
      'entityIntelligenceAgentConversationContent',
      spaceId,
      agentId,
      conversationId,
      invocation.id,
      call?.id,
    ],
    async ({ signal }) => {
      if (!conversationId) throw new Error('No conversation reference is available');
      const response = await http.get<AgentConversationResponse>(
        `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`,
        { version: '2023-10-31', signal }
      );
      if (
        response.id !== conversationId ||
        response.agent_id !== agentId ||
        !getConversationReferenceAliases(response.id).includes(
          invocation.conversationReference ?? ''
        )
      ) {
        throw new Error('The conversation does not match this agent invocation');
      }
      return buildAgentConversationDetail(response, invocation, call);
    },
    {
      enabled,
      retry: false,
      cacheTime: 0,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    }
  );
  return {
    detail: !enabled || query.isError || query.isFetching ? undefined : query.data,
    isLoading: enabled && query.isFetching,
    unavailable: !enabled || query.isError,
  };
};
