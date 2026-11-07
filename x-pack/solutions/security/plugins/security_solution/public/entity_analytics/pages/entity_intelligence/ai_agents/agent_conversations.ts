/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Sha256 } from '@kbn/crypto-browser';
import type { JsonObject, JsonValue } from '@kbn/utility-types';
import { createContentRedactor } from '../../../../../common/entity_intelligence/content_redaction';
import type { AgentInvocation, AgentToolCall } from './types';

export const AGENT_CONVERSATION_LIMIT = 100;
export const AGENT_CONTENT_LIMIT = 20_000;

export interface AgentConversationSummary {
  id: string;
  agentId: string;
  title: string;
  updatedAt: string;
  referenceAliases: string[];
}

export interface AgentConversationListResponse {
  pagination: { total: number };
  results: Array<{ id: string; agent_id: string; title: string; updated_at: string }>;
}

export interface AgentConversationRound {
  id: string;
  trace_id?: string | string[];
  author?: { id: string; username?: string; full_name?: string };
  origin?: { type: string };
  input: { message: string };
  response?: { message: string };
  steps: Array<{
    type: string;
    tool_call_id?: string;
    tool_id?: string;
    params?: JsonObject;
    results?: JsonValue[];
  }>;
}

export interface AgentConversationResponse {
  id: string;
  agent_id: string;
  title: string;
  rounds: AgentConversationRound[];
}

export interface AgentContentText {
  text: string;
  redacted: boolean;
  truncated: boolean;
}

export interface AgentConversationDetail {
  status: 'matched' | 'round_missing' | 'round_ambiguous' | 'tool_missing' | 'tool_ambiguous';
  conversationId: string;
  title: string;
  roundId?: string;
  prompt?: AgentContentText;
  response?: AgentContentText;
  tool?: { id: string; callId: string; arguments?: AgentContentText; results?: AgentContentText };
}

export const getConversationReferenceAliases = (id: string): string[] => [
  id,
  new Sha256().update(id, 'utf8').digest('hex').slice(0, 16),
];

export const projectAgentConversations = (
  response: AgentConversationListResponse,
  agentId: string
): AgentConversationSummary[] =>
  response.results
    .filter((conversation) => conversation.agent_id === agentId)
    .slice(0, AGENT_CONVERSATION_LIMIT)
    .map((conversation) => ({
      id: conversation.id,
      agentId: conversation.agent_id,
      title: createContentRedactor().redact(conversation.title, 500).text,
      updatedAt: conversation.updated_at,
      referenceAliases: getConversationReferenceAliases(conversation.id),
    }));

/** Resolves only one exact raw or privacy-normalized ID among conversations the current user can read. */
export const findInvocationConversation = (
  invocation: AgentInvocation,
  conversations: AgentConversationSummary[]
): AgentConversationSummary | undefined => {
  const matches = conversations.filter((conversation) =>
    conversation.referenceAliases.includes(invocation.conversationReference ?? '')
  );
  return matches.length === 1 ? matches[0] : undefined;
};

/** Projects only the recorded round and tool call linked to the selected trace, excluding reasoning and attachments. */
export const buildAgentConversationDetail = (
  conversation: AgentConversationResponse,
  invocation: AgentInvocation,
  call?: AgentToolCall
): AgentConversationDetail => {
  const redactor = createContentRedactor();
  const strings = conversation.rounds.flatMap((round) => [
    round.input.message,
    round.response?.message ?? '',
    ...round.steps
      .filter((step) => step.type === 'tool_call')
      .flatMap((step) => [JSON.stringify(step.params ?? {}), JSON.stringify(step.results ?? [])]),
  ]);
  strings.forEach((value) => redactor.observe(value));
  redactor.observe(conversation.title);
  const result: AgentConversationDetail = {
    status: 'round_missing',
    conversationId: conversation.id,
    title: redactor.redact(conversation.title, 500).text,
  };
  const rounds = conversation.rounds.filter((round) =>
    (Array.isArray(round.trace_id) ? round.trace_id : [round.trace_id]).includes(invocation.traceId)
  );
  if (rounds.length !== 1)
    return { ...result, status: rounds.length ? 'round_ambiguous' : 'round_missing' };
  const [round] = rounds;
  const roundResult: AgentConversationDetail = {
    ...result,
    status: 'matched',
    roundId: round.id,
    prompt: redactor.redact(round.input.message, AGENT_CONTENT_LIMIT),
    response: round.response
      ? redactor.redact(round.response.message, AGENT_CONTENT_LIMIT)
      : undefined,
  };
  if (!call) return roundResult;
  if (
    call.traceId !== invocation.traceId ||
    call.invocationSpanId !== invocation.spanId ||
    !call.toolCallId
  ) {
    return { ...roundResult, status: 'tool_missing' };
  }
  const steps = round.steps.filter(
    (step) => step.type === 'tool_call' && step.tool_call_id === call.toolCallId
  );
  if (steps.length !== 1)
    return { ...roundResult, status: steps.length ? 'tool_ambiguous' : 'tool_missing' };
  const [step] = steps;
  return {
    ...roundResult,
    tool: {
      id: redactor.redact(step.tool_id ?? call.toolName, 500).text,
      callId: call.toolCallId,
      arguments:
        step.params === undefined
          ? undefined
          : redactor.redact(JSON.stringify(step.params, null, 2), AGENT_CONTENT_LIMIT),
      results:
        step.results === undefined
          ? undefined
          : redactor.redact(JSON.stringify(step.results, null, 2), AGENT_CONTENT_LIMIT),
    },
  };
};
