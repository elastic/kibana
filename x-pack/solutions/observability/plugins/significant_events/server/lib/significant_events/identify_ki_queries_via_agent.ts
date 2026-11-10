/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import type { GeneratedSignificantEventQuery } from '@kbn/significant-events-schema';
import { buildKIQueryGenerationUserMessage } from '@kbn/nightshift-ai';
import type { ExistingQuerySummary } from '@kbn/nightshift-ai';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
  SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
  type AcceptedQuery,
} from '../../agent_builder/skills/ki_query_generation';
import { chatTokenCountFromRounds } from './features/chat_token_count';

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

export interface BuildKIQueryGenerationMessageOptions {
  source: NightshiftSource;
  existingQueries: ExistingQuerySummary[];
  maxExistingQueriesForContext: number;
}

export function buildKIQueryGenerationMessage({
  source,
  existingQueries,
  maxExistingQueriesForContext,
}: BuildKIQueryGenerationMessageOptions): string {
  return buildKIQueryGenerationUserMessage(
    { slug: source.slug, description: source.description },
    existingQueries,
    maxExistingQueriesForContext
  );
}

/**
 * Reads what the query generation agent finalized from the conversation the `ai.agent` step
 * stored. The step runs the agent, this reads its last `validate_queries` result.
 */
export function readKIQueryGenerationResult({
  conversation,
  source,
  logger,
}: {
  conversation: Pick<Conversation, 'rounds'>;
  source: NightshiftSource;
  logger: Logger;
}): {
  queries: GeneratedSignificantEventQuery[];
  tokensUsed: ChatCompletionTokenCount;
  durationMs: number;
} | null {
  const round = conversation.rounds.at(-1);
  const validationStep = round?.steps
    .filter(isToolCallStep)
    .filter((step) => step.tool_id === SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID)
    .at(-1);
  const finalizedData = validationStep?.results
    .map(({ data }) => data)
    .find(isFinalizedValidationData);

  if (!finalizedData) {
    logger.warn(`KI query generation agent did not finalize validate_queries for "${source.slug}"`);
    return null;
  }
  if (finalizedData.slug !== source.slug) {
    throw new Error(
      `KI query generation agent finalized for unexpected source "${finalizedData.slug}"`
    );
  }

  const queries: GeneratedSignificantEventQuery[] = finalizedData.finalized_queries.map((q) => ({
    type: q.type,
    title: q.title,
    description: q.description,
    esql: q.esql,
    category: q.category,
    severity_score: q.severity_score,
    evidence: q.evidence,
    replaces: q.replaces,
    features: q.features,
  }));

  // Every round counts: the `ai.agent` step retries on the same conversation.
  const tokensUsed: ChatCompletionTokenCount = chatTokenCountFromRounds(conversation.rounds);

  logger.debug(`KI query generation agent returned ${queries.length} queries for "${source.slug}"`);

  return { queries, tokensUsed, durationMs: round?.time_to_last_token ?? 0 };
}
