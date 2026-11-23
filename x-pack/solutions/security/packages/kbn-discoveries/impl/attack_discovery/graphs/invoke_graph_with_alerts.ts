/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { TelemetryMetadata } from '@kbn/actions-plugin/server/lib';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { InferenceClient } from '@kbn/inference-common';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import type { AttackDiscoveryGraphState } from '../../lib/types';
import type { CombinedPrompts } from '.';
import {
  ATTACK_DISCOVERY_GRAPH_RUN_NAME,
  ATTACK_DISCOVERY_TAG,
  getDefaultAttackDiscoveryGraph,
  resolveAttackDiscoveryTemplateCompletion,
} from '.';
import {
  attackDiscoveryTemplateOmissionMessage,
  capAttackDiscoveryTemplateCount,
  takeAttackDiscoveryTemplateAlerts,
} from './template_completion';
import { getLlmType } from '../../lib/helpers/get_llm_type';
import { setGraphCounterAttributes } from '../../lib/langchain/tracing/with_graph_node_span';
import { throwIfErrorCountsExceeded } from './throw_if_error_counts_exceeded';

export interface InvokeAttackDiscoveryGraphWithAlertsParams {
  abortSignal?: AbortSignal;
  actionsClient: PublicMethodsOf<ActionsClient>;
  additionalContext?: string;
  alerts: Document[];
  alertsIndexPattern?: string;
  anonymizationFields?: AnonymizationFieldResponse[];
  apiConfig: {
    action_type_id: string;
    connector_id: string;
    model?: string;
  };
  connectorTimeout: number;
  end?: string;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown>;
  inferenceClient?: InferenceClient;
  langSmithApiKey?: string;
  langSmithProject?: string;
  logger: Logger;
  prompts: CombinedPrompts;
  replacements?: Replacements;
  size?: number;
  start?: string;
  /**
   * Token-usage attribution for the graph's model calls. Callers that belong to a product with its
   * own cost rollup set it; unset leaves the calls with the default attribution.
   */
  telemetryMetadata?: TelemetryMetadata;
}

export interface InvokeGraphResult {
  alertsContextCount: number;
  discoveries: AttackDiscovery[] | null;
  generationAttempts: number;
  hallucinationFailures: number;
  replacements: Replacements;
}

/**
 * Thrown inside the root span in place of the retry-limit error. The span records a thrown error as
 * an exception event and status message, so it carries only the summary line, not the accumulated
 * model errors that follow it. The caller gets `fullError` back once the span has closed.
 */
class RetryLimitSpanError extends Error {
  constructor(public readonly fullError: Error) {
    super(fullError.message.split('\n')[0]);
  }
}

const throwSpanSafeErrorIfCountsExceeded = (
  params: Parameters<typeof throwIfErrorCountsExceeded>[0]
): void => {
  try {
    throwIfErrorCountsExceeded(params);
  } catch (error) {
    throw new RetryLimitSpanError(error as Error);
  }
};

/** Runs `fn` (which contains the root span) and swaps a `RetryLimitSpanError` for its full error. */
const withFullRetryLimitError = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    throw error instanceof RetryLimitSpanError ? error.fullError : error;
  }
};

/**
 * Orchestrates Attack Discovery graph execution with pre-retrieved alerts.
 *
 * Prompts are provided by the calling plugin (discoveries) using
 * its prompt management system (@kbn/security-ai-prompts with local fallbacks).
 *
 * This keeps the package independent of any specific prompt storage mechanism.
 */
export const invokeAttackDiscoveryGraphWithAlerts = async ({
  abortSignal,
  actionsClient,
  additionalContext,
  alerts,
  alertsIndexPattern,
  anonymizationFields = [],
  apiConfig,
  connectorTimeout,
  end,
  esClient,
  filter,
  inferenceClient,
  langSmithApiKey,
  langSmithProject,
  logger,
  prompts,
  replacements = {},
  size = 10,
  start,
  telemetryMetadata,
}: InvokeAttackDiscoveryGraphWithAlertsParams): Promise<InvokeGraphResult> => {
  const { action_type_id: actionTypeId, connector_id: connectorId, model } = apiConfig;

  const llmType = getLlmType(actionTypeId);
  const isInferenceEndpoint = actionTypeId === '.inference' && inferenceClient != null;

  const llm = new ActionsClientLlm({
    actionsClient,
    connectorId,
    inferenceClient: isInferenceEndpoint ? inferenceClient : undefined,
    isInferenceEndpoint,
    llmType,
    logger,
    model,
    ...(telemetryMetadata != null ? { telemetryMetadata } : {}),
    temperature: 0,
    timeout: connectorTimeout,
    traceOptions: {
      projectName: langSmithProject,
      tracers: getLangSmithTracer({
        apiKey: langSmithApiKey,
        logger,
        projectName: langSmithProject,
      }),
    },
  });

  const completeWithTemplate = await resolveAttackDiscoveryTemplateCompletion({
    inferenceClient: isInferenceEndpoint ? inferenceClient : undefined,
    connectorId,
    logger,
    ...(telemetryMetadata != null ? { telemetryMetadata } : {}),
    timeout: connectorTimeout,
  });

  // Cap before the graph retrieves or reports coverage. The completion also
  // clamps, and this keeps `alertsContextCount` equal to the alerts analyzed.
  let alertsForGraph = alerts;
  let sizeForGraph = size;
  if (completeWithTemplate) {
    const requestedSize = sizeForGraph;
    sizeForGraph = capAttackDiscoveryTemplateCount(sizeForGraph) ?? sizeForGraph;
    if (alerts.length > 0) {
      const limited = takeAttackDiscoveryTemplateAlerts(alerts);
      alertsForGraph = limited.alerts;
      if (limited.omitted > 0) {
        logger.warn(attackDiscoveryTemplateOmissionMessage(limited.omitted, alerts.length));
      }
    } else if (requestedSize != null && sizeForGraph < requestedSize) {
      logger.warn(
        attackDiscoveryTemplateOmissionMessage(requestedSize - sizeForGraph, requestedSize)
      );
    }
  }

  const graph = getDefaultAttackDiscoveryGraph({
    alertsIndexPattern,
    anonymizationFields,
    end,
    esClient,
    filter,
    llm,
    logger,
    onNewReplacements: (newReplacements) => {
      Object.assign(replacements, newReplacements);
    },
    prompts,
    replacements,
    size: sizeForGraph,
    start,
    ...(completeWithTemplate ? { completeWithTemplate } : {}),
  });

  logger.debug(() => `Invoking Attack Discovery graph with ${alerts.length} pre-retrieved alerts`);

  // Check if already aborted before starting graph execution
  if (abortSignal?.aborted) {
    throw new Error('Graph execution aborted before starting');
  }

  const promptWithAdditionalContext =
    additionalContext != null && additionalContext.length > 0
      ? `${prompts.default}\n\nAdditional context:\n${additionalContext}`
      : undefined;

  return withFullRetryLimitError(() =>
    withActiveInferenceSpan(
      'attack_discovery.graph',
      { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
      async (span) => {
        const graphResult: AttackDiscoveryGraphState = await graph.invoke(
          {
            anonymizedDocuments: alertsForGraph,
            ...(promptWithAdditionalContext != null ? { prompt: promptWithAdditionalContext } : {}),
            replacements,
          },
          {
            callbacks: langSmithProject
              ? getLangSmithTracer({
                  apiKey: langSmithApiKey,
                  logger,
                  projectName: langSmithProject,
                })
              : [],
            runName: ATTACK_DISCOVERY_GRAPH_RUN_NAME,
            signal: abortSignal,
            tags: [ATTACK_DISCOVERY_TAG, llmType, model].filter(Boolean) as string[],
          }
        );
        setGraphCounterAttributes(span, graphResult);

        logger.debug(
          () => `Graph execution completed: ${graphResult.insights?.length ?? 0} discoveries`
        );

        const {
          errors,
          generationAttempts,
          hallucinationFailures,
          maxGenerationAttempts,
          maxHallucinationFailures,
        } = graphResult;

        throwSpanSafeErrorIfCountsExceeded({
          errors,
          generationAttempts,
          hallucinationFailures,
          logger,
          maxGenerationAttempts,
          maxHallucinationFailures,
        });

        return {
          alertsContextCount: graphResult.anonymizedDocuments.length,
          discoveries: graphResult.insights,
          generationAttempts,
          hallucinationFailures,
          replacements: graphResult.replacements,
        };
      }
    )
  );
};
