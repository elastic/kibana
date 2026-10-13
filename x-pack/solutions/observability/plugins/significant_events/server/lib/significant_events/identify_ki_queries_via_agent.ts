/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, toArray } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import {
  AgentExecutionMode,
  CONVERSATION_TITLE_MAX_LENGTH,
  ConversationAccessControlMode,
  isRoundCompleteEvent,
  isToolResultEvent,
} from '@kbn/agent-builder-common';
import type { GeneratedSignificantEventQuery } from '@kbn/significant-events-schema';
import {
  NIGHTSHIFT_KI_QUERY_GENERATION_USAGE_ID,
  NIGHTSHIFT_USAGE_PARENT_ID,
  NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
  NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
} from '@kbn/nightshift-shared';
import { EMPTY_TOKENS, buildKIQueryGenerationUserMessage } from '@kbn/nightshift-ai';
import type { ExistingQuerySummary } from '@kbn/nightshift-ai';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { KI_QUERY_GENERATION_AGENT_ID } from '../../agent_builder/agents/ki_query_generation';
import {
  SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
  type AcceptedQuery,
} from '../../agent_builder/skills/ki_query_generation';
import { chatTokenCountFromModelUsage } from './features/chat_token_count';

const QUERY_GENERATION_MAX_DURATION_MS = 300_000;

interface FinalizedValidationData {
  slug: string;
  finalized: true;
  finalized_queries: AcceptedQuery[];
}

const isFinalizedValidationData = (data: unknown): data is FinalizedValidationData =>
  typeof data === 'object' &&
  data !== null &&
  'slug' in data &&
  typeof data.slug === 'string' &&
  'finalized' in data &&
  data.finalized === true &&
  'finalized_queries' in data &&
  Array.isArray(data.finalized_queries);

export interface ExecuteKIQueryGenerationAgentOptions {
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  connectorId: string;
  interactionId: string;
  source: NightshiftSource;
  existingQueries: ExistingQuerySummary[];
  signal?: AbortSignal;
  logger: Logger;
}

export async function executeKIQueryGenerationAgent({
  agentBuilder,
  request,
  connectorId,
  interactionId,
  source,
  existingQueries,
  signal,
  logger,
}: ExecuteKIQueryGenerationAgentOptions): Promise<{
  queries: GeneratedSignificantEventQuery[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  const userMessage = buildKIQueryGenerationUserMessage(
    { slug: source.slug, description: source.description },
    existingQueries
  );

  const conversationClient = await agentBuilder.conversations.getScopedClient({ request });
  const conversation = await conversationClient.create({
    agentId: KI_QUERY_GENERATION_AGENT_ID,
    title: `KI query generation: ${source.slug}`.slice(0, CONVERSATION_TITLE_MAX_LENGTH),
    accessControl: { access_mode: ConversationAccessControlMode.Public },
  });

  const timeoutSignal = AbortSignal.timeout(QUERY_GENERATION_MAX_DURATION_MS);
  const executionSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const { events$ } = await agentBuilder.execution.executeAgent({
    mode: AgentExecutionMode.conversation,
    request,
    abortSignal: executionSignal,
    useTaskManager: false,
    params: {
      agentId: KI_QUERY_GENERATION_AGENT_ID,
      connectorId,
      conversationId: conversation.id,
      storeConversation: true,
      nextInput: { message: userMessage },
      telemetryMetadata: {
        pluginId: NIGHTSHIFT_KI_QUERY_GENERATION_USAGE_ID,
        aggregateBy: NIGHTSHIFT_USAGE_PARENT_ID,
        productSolution: NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
        productFeature: NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
        interactionId,
      },
    },
  });

  const events = await firstValueFrom(events$.pipe(toArray()));

  const validationResultEvent = events
    .filter(isToolResultEvent)
    .filter((event) => event.data.tool_id === SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID)
    .at(-1);
  const finalizedData = validationResultEvent?.data.results
    .map(({ data }) => data)
    .find(isFinalizedValidationData);

  if (!finalizedData) {
    throw new Error('KI query generation agent did not finalize validate_queries');
  }
  if (finalizedData.slug !== source.slug) {
    throw new Error(
      `KI query generation agent finalized for unexpected source "${finalizedData.slug}"`
    );
  }

  const roundEvent = events.find(isRoundCompleteEvent);
  const rawQueries = finalizedData.finalized_queries;

  const queries: GeneratedSignificantEventQuery[] = rawQueries.map((q) => ({
    type: q.type,
    title: q.title,
    description: q.description,
    esql: q.esql,
    severity_score: q.severity_score,
    evidence: q.evidence,
    replaces: q.replaces,
    features: q.features,
  }));

  const tokensUsed: ChatCompletionTokenCount = chatTokenCountFromModelUsage(
    roundEvent?.data.round.model_usage
  ) ?? { ...EMPTY_TOKENS };

  logger.debug(`KI query generation agent returned ${queries.length} queries for "${source.slug}"`);

  return { queries, tokensUsed };
}
