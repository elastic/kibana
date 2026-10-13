/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SignificantEventsQueriesGenerationResult } from '@kbn/significant-events-schema';
import type { EbtTelemetryClient } from '../telemetry/ebt';
import type { KnowledgeIndicatorClient } from '../knowledge_indicators';
import { executeKIQueryGenerationAgent } from './identify_ki_queries_via_agent';

export interface GenerateKIQueriesParams {
  source: NightshiftSource;
  connectorId?: string;
  runId: string;
}

export interface GenerateKIQueriesDependencies {
  kiClient: KnowledgeIndicatorClient;
  agentBuilder: AgentBuilderPluginStart;
  resolveModel: (requestedId?: string) => Promise<string>;
  request: KibanaRequest;
  logger: Logger;
  signal: AbortSignal;
  telemetry: EbtTelemetryClient;
}

export async function generateKIQueries(
  params: GenerateKIQueriesParams,
  deps: GenerateKIQueriesDependencies
): Promise<SignificantEventsQueriesGenerationResult & { connectorId: string }> {
  const { source, connectorId: connectorIdOverride, runId } = params;
  const { kiClient, agentBuilder, resolveModel, request, logger, signal, telemetry } = deps;

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

  const startedAt = Date.now();
  const { queries, tokensUsed } = await executeKIQueryGenerationAgent({
    agentBuilder,
    request,
    connectorId,
    interactionId: runId,
    source,
    existingQueries,
    signal,
    logger: logger.get('significant_events_queries_generation'),
  });
  const durationMs = Date.now() - startedAt;

  telemetry.trackSignificantEventsQueriesGenerated({
    count: queries.length,
    connector_id: connectorId,
    source_id: source.id,
    input_tokens_used: tokensUsed.prompt,
    output_tokens_used: tokensUsed.completion,
    cached_tokens_used: tokensUsed.cached ?? 0,
    duration_ms: durationMs,
  });

  return { queries, tokensUsed, connectorId };
}
