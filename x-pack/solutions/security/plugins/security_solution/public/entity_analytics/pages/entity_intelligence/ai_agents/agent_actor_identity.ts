/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Sha256 } from '@kbn/crypto-browser';
import { getConversationReferenceAliases } from './agent_conversations';
import type { AgentConversationResponse } from './agent_conversations';
import type { AgentInvocation } from './types';

export interface AgentResolvedActor {
  id: string;
  name: string;
  username?: string;
  provenance: 'conversation_author';
  conversationId: string;
  roundId: string;
}

/** Resolves a recorded actor only through matching author evidence from an accessible conversation. */
export const resolveAgentActor = (
  conversation: AgentConversationResponse,
  invocation: AgentInvocation
): AgentResolvedActor | undefined => {
  const attribution = invocation.attribution;
  const actor = attribution?.initiatingActor;
  if (
    attribution?.status !== 'partial' ||
    attribution.source !== 'kibana_authc' ||
    actor?.source !== 'kibana_authc' ||
    attribution.caller?.type !== 'user' ||
    attribution.caller.apiKeyId !== undefined ||
    attribution.caller.apiKeyHash !== undefined ||
    !conversation.id.trim() ||
    !invocation.traceId.trim() ||
    !getConversationReferenceAliases(conversation.id).includes(
      invocation.conversationReference ?? ''
    )
  ) {
    return undefined;
  }

  const rounds = conversation.rounds.filter((round) =>
    (Array.isArray(round.trace_id) ? round.trace_id : [round.trace_id]).includes(invocation.traceId)
  );
  if (rounds.length !== 1) return undefined;
  const [round] = rounds;
  const author = round.author;
  if (round.origin !== undefined || !round.id.trim() || !author?.id.trim()) return undefined;

  const hasActorId = actor.id !== undefined;
  const hasActorHash = actor.hash !== undefined;
  if (!hasActorId && !hasActorHash) return undefined;
  if (hasActorId && actor.id !== author.id) return undefined;
  if (
    hasActorHash &&
    actor.hash !== new Sha256().update(author.id, 'utf8').digest('hex').slice(0, 16)
  ) {
    return undefined;
  }

  const username = author.username?.trim() || undefined;
  const name = author.full_name?.trim() || username;
  if (!name) return undefined;

  return {
    id: author.id,
    name,
    ...(username ? { username } : {}),
    provenance: 'conversation_author',
    conversationId: conversation.id,
    roundId: round.id,
  };
};
