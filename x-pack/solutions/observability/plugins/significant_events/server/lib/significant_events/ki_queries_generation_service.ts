/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Conversation } from '@kbn/agent-builder-common';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SignificantEventsQueriesGenerationResult } from '@kbn/significant-events-schema';
import type { EbtTelemetryClient } from '../telemetry/ebt';
import type { KnowledgeIndicatorClient } from '../knowledge_indicators';
import {
  buildKIQueryGenerationMessage,
  readKIQueryGenerationResult,
} from './identify_ki_queries_via_agent';
import { chatTokenCountFromRounds } from './features/chat_token_count';

export interface BuildKIQueryGenerationInputParams {
  source: NightshiftSource;
  connectorId?: string;
  maxExistingQueriesForContext: number;
}

export interface BuildKIQueryGenerationInputDependencies {
  kiClient: KnowledgeIndicatorClient;
  resolveModel: (requestedId?: string) => Promise<string>;
  logger: Logger;
}

/** Everything the query generation agent is asked, built before the agent runs. */
export async function buildKIQueryGenerationInput(
  params: BuildKIQueryGenerationInputParams,
  deps: BuildKIQueryGenerationInputDependencies
): Promise<{ connectorId: string; message: string }> {
  const { source, connectorId: connectorIdOverride, maxExistingQueriesForContext } = params;
  const { kiClient, resolveModel, logger } = deps;

  const connectorId = await resolveModel(connectorIdOverride);

  logger.debug(`Using connector ${connectorId} for query generation`);

  const { [source.id]: existingLinks } = await kiClient.getSourceToQueryLinksMap([source.id]);
  const existingQueries = existingLinks.map(({ query }) => ({
    id: query.id,
    title: query.title,
    type: query.type,
    severity_score: query.severity_score,
    description: query.description,
    esql: query.esql.query,
  }));

  return {
    connectorId,
    message: buildKIQueryGenerationMessage({
      source,
      existingQueries,
      maxExistingQueriesForContext,
    }),
  };
}

export interface CollectGeneratedKIQueriesParams {
  source: NightshiftSource;
  connectorId: string;
  /** The conversation the `ai.agent` step stored. */
  agentConversation: Pick<Conversation, 'rounds'>;
}

export interface CollectGeneratedKIQueriesDependencies {
  logger: Logger;
  telemetry: EbtTelemetryClient;
}

export function collectGeneratedKIQueries(
  { source, connectorId, agentConversation }: CollectGeneratedKIQueriesParams,
  { logger, telemetry }: CollectGeneratedKIQueriesDependencies
): SignificantEventsQueriesGenerationResult & { connectorId: string; finalized: boolean } {
  const result = readKIQueryGenerationResult({
    conversation: agentConversation,
    source,
    logger,
  });
  // The workflow runs the agent again when it never finalized, so this is not an error here. The
  // attempt still spent tokens, which the workflow adds to its total.
  if (!result) {
    return {
      queries: [],
      tokensUsed: chatTokenCountFromRounds(agentConversation.rounds),
      connectorId,
      finalized: false,
    };
  }
  const { queries, tokensUsed, durationMs } = result;

  telemetry.trackSignificantEventsQueriesGenerated({
    count: queries.length,
    connector_id: connectorId,
    source_id: source.id,
    input_tokens_used: tokensUsed.prompt,
    output_tokens_used: tokensUsed.completion,
    cached_tokens_used: tokensUsed.cached ?? 0,
    duration_ms: durationMs,
  });

  return { queries, tokensUsed, connectorId, finalized: true };
}
