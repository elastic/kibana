/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
  NightshiftModelBlockedError,
  NightshiftModelNotFoundError,
  type SignificantEventsQueriesGenerationResult,
} from '@kbn/significant-events-schema';
import type {
  EbtTelemetryClient,
  KnowledgeIndicatorQueriesGenerationFailureCode,
} from '../telemetry/ebt';
import type { KnowledgeIndicatorClient } from '../knowledge_indicators';
import { trackTelemetryBestEffort } from '../../agent_builder/tools/bulk_write';
import {
  executeKIQueryGenerationAgent,
  KIQueryGenerationAgentError,
} from './identify_ki_queries_via_agent';

export interface GenerateKIQueriesParams {
  source: NightshiftSource;
  connectorId?: string;
  runId: string;
  workflowExecutionId?: string;
  parentWorkflowExecutionId?: string;
  maxExistingQueriesForContext: number;
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

const toGenerationFailureCode = (
  error: unknown,
  signal: AbortSignal
): KnowledgeIndicatorQueriesGenerationFailureCode => {
  if (error instanceof NightshiftModelNotFoundError) {
    return 'model_not_found';
  }
  if (error instanceof NightshiftModelBlockedError) {
    return 'model_blocked';
  }
  if (error instanceof KIQueryGenerationAgentError) {
    return error.reason;
  }
  return signal.aborted ? 'aborted' : 'internal_error';
};

export async function generateKIQueries(
  params: GenerateKIQueriesParams,
  deps: GenerateKIQueriesDependencies
): Promise<SignificantEventsQueriesGenerationResult & { connectorId: string }> {
  const {
    source,
    connectorId: connectorIdOverride,
    runId,
    workflowExecutionId,
    parentWorkflowExecutionId,
    maxExistingQueriesForContext,
  } = params;
  const { kiClient, agentBuilder, resolveModel, request, logger, signal, telemetry } = deps;

  const attemptStartedAt = Date.now();
  let resolvedConnectorId: string | undefined;
  try {
    const connectorId = await resolveModel(connectorIdOverride);
    resolvedConnectorId = connectorId;

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

    const agentStartedAt = Date.now();
    const { queries, tokensUsed } = await executeKIQueryGenerationAgent({
      agentBuilder,
      request,
      connectorId,
      interactionId: runId,
      source,
      existingQueries,
      maxExistingQueriesForContext,
      signal,
      logger: logger.get('significant_events_queries_generation'),
    });

    const durationMs = Date.now() - agentStartedAt;
    trackTelemetryBestEffort({
      logger,
      description: 'generated queries',
      track: () =>
        telemetry.trackSignificantEventsQueriesGenerated(
          {
            workflow_execution_id: workflowExecutionId,
            parent_workflow_execution_id: parentWorkflowExecutionId,
            count: queries.length,
            connector_id: connectorId,
            source_id: source.id,
            input_tokens_used: tokensUsed.prompt,
            output_tokens_used: tokensUsed.completion,
            cached_tokens_used: tokensUsed.cached ?? 0,
            duration_ms: durationMs,
          },
          request
        ),
    });

    return { queries, tokensUsed, connectorId };
  } catch (error) {
    trackTelemetryBestEffort({
      logger,
      description: 'query generation failure',
      track: () =>
        telemetry.trackSignificantEventsQueriesGenerationFailed(
          {
            workflow_execution_id: workflowExecutionId,
            parent_workflow_execution_id: parentWorkflowExecutionId,
            error_code: toGenerationFailureCode(error, signal),
            ...(resolvedConnectorId !== undefined ? { connector_id: resolvedConnectorId } : {}),
            source_id: source.id,
            duration_ms: Date.now() - attemptStartedAt,
          },
          request
        ),
    });
    throw error;
  }
}
