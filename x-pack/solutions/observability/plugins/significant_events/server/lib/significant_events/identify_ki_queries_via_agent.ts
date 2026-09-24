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
import {
  SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  type GeneratedSignificantEventQuery,
} from '@kbn/significant-events-schema';
import { EMPTY_TOKENS } from '@kbn/nightshift-ai';
import type { Streams } from '@kbn/streams-schema';
import type { AnalysisTarget, ExistingQuerySummary } from '@kbn/nightshift-ai';
import { KI_QUERY_GENERATION_AGENT_ID } from '../../agent_builder/agents/ki_query_generation';
import {
  SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
  type AcceptedQuery,
} from '../../agent_builder/skills/ki_query_generation';
import { chatTokenCountFromModelUsage } from './features/chat_token_count';
import { streamToAnalysisTarget } from './stream_to_analysis_target';

const QUERY_GENERATION_MAX_DURATION_MS = 300_000;
export const MAX_EXISTING_QUERIES_FOR_CONTEXT = 50;
const MAX_EXISTING_QUERY_DESCRIPTION_LENGTH = 200;

interface FinalizedValidationData {
  target_id: string;
  finalized: true;
  finalized_queries: AcceptedQuery[];
}

const isFinalizedValidationData = (data: unknown): data is FinalizedValidationData =>
  typeof data === 'object' &&
  data !== null &&
  'target_id' in data &&
  typeof data.target_id === 'string' &&
  'finalized' in data &&
  data.finalized === true &&
  'finalized_queries' in data &&
  Array.isArray(data.finalized_queries);

export interface ExecuteKIQueryGenerationAgentOptions {
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  connectorId: string;
  definition: Streams.all.Definition;
  existingQueries: ExistingQuerySummary[];
  signal?: AbortSignal;
  logger: Logger;
}

export async function executeKIQueryGenerationAgent({
  agentBuilder,
  request,
  connectorId,
  definition,
  existingQueries,
  signal,
  logger,
}: ExecuteKIQueryGenerationAgentOptions): Promise<{
  queries: GeneratedSignificantEventQuery[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  const target = streamToAnalysisTarget(definition);
  const userMessage = buildKIQueryGenerationUserMessage(target, existingQueries);

  const conversationClient = await agentBuilder.conversations.getScopedClient({ request });
  const conversation = await conversationClient.create({
    agentId: KI_QUERY_GENERATION_AGENT_ID,
    title: `KI query generation: ${definition.name}`.slice(0, CONVERSATION_TITLE_MAX_LENGTH),
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
        pluginId: SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
        aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
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
  if (finalizedData.target_id !== target.id) {
    throw new Error(
      `KI query generation agent finalized for unexpected target "${finalizedData.target_id}"`
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

  logger.debug(
    `KI query generation agent returned ${queries.length} queries for "${definition.name}"`
  );

  return { queries, tokensUsed };
}

export function buildKIQueryGenerationUserMessage(
  target: AnalysisTarget,
  existingQueries: ExistingQuerySummary[] = []
): string {
  const parts: string[] = [];
  parts.push(`\`target_id\`: ${target.id}`);
  if (target.description) {
    parts.push(`\`target_description\`: ${target.description}`);
  }
  if (existingQueries.length > 0) {
    const existingQueriesContext = [...existingQueries]
      .sort((a, b) => (b.severity_score ?? 0) - (a.severity_score ?? 0))
      .slice(0, MAX_EXISTING_QUERIES_FOR_CONTEXT)
      .map((query) => ({
        ...query,
        description: query.description.slice(0, MAX_EXISTING_QUERY_DESCRIPTION_LENGTH),
      }));
    parts.push(`\`existing_queries\`:\n${JSON.stringify(existingQueriesContext)}`);
  }
  return parts.join('\n\n');
}
