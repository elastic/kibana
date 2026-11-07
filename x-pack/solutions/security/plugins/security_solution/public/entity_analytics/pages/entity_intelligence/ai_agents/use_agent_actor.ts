/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../common/lib/kibana';
import { resolveAgentActor } from './agent_actor_identity';
import type { AgentResolvedActor } from './agent_actor_identity';
import { getConversationReferenceAliases } from './agent_conversations';
import type { AgentConversationResponse } from './agent_conversations';
import type { AgentInvocation } from './types';

export interface AgentActorResult {
  actor?: AgentResolvedActor;
  isLoading: boolean;
  unavailable: boolean;
}

/** Resolves a recorded initiating user through the exact conversation's current access controls. */
export const useAgentActor = (
  spaceId: string | undefined,
  agentId: string,
  conversationId: string | undefined,
  invocation: AgentInvocation | undefined
): AgentActorResult => {
  const { http } = useKibana().services;
  const attribution = invocation?.attribution;
  const actor = attribution?.initiatingActor;
  const caller = attribution?.caller;
  const enabled = Boolean(
    spaceId?.trim() &&
      agentId.trim() &&
      conversationId?.trim() &&
      invocation?.id.trim() &&
      invocation.traceId.trim() &&
      invocation.spanId.trim() &&
      invocation.conversationReference?.trim() &&
      attribution?.status === 'partial' &&
      attribution.source === 'kibana_authc' &&
      actor?.source === 'kibana_authc' &&
      (actor.id?.trim() || actor.hash?.trim()) &&
      !actor.name?.trim() &&
      caller?.type === 'user' &&
      caller.apiKeyId === undefined &&
      caller.apiKeyHash === undefined
  );
  const query = useQuery<{ actor?: AgentResolvedActor }>(
    [
      'entityIntelligenceAgentActor',
      spaceId,
      agentId,
      conversationId,
      invocation?.id,
      invocation?.traceId,
      invocation?.spanId,
      invocation?.conversationReference,
      invocation?.source,
      attribution,
    ],
    async ({ signal }) => {
      if (!enabled || !conversationId || !invocation) {
        throw new Error('No trusted initiating user is available');
      }
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
      return { actor: resolveAgentActor(response, invocation) };
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
    actor: !enabled || query.isError || query.isFetching ? undefined : query.data?.actor,
    isLoading: enabled && query.isFetching,
    unavailable:
      !enabled || query.isError || (!query.isFetching && !query.isLoading && !query.data?.actor),
  };
};
