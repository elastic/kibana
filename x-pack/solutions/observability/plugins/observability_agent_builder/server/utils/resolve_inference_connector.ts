/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound, serverUnavailable } from '@hapi/boom';
import type { InferenceConnector } from '@kbn/inference-common';
import type { ResolvedInferenceEndpoints } from '@kbn/search-inference-endpoints/server';
import { MODEL_SETTINGS_FEATURE_FLAG_ID } from '@kbn/search-inference-endpoints/common/constants';
import type { KibanaRequest, Logger, RequestHandlerContext } from '@kbn/core/server';
import { OBSERVABILITY_AI_SETTINGS_SUBFEATURE_ID } from '../../common/constants';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
import { getDefaultConnectorId } from './get_default_connector_id';

interface ResolveArgs {
  core: ObservabilityAgentBuilderCoreSetup;
  context: RequestHandlerContext;
  request: KibanaRequest;
  logger: Logger;
}

/**
 * Returns the default connector for Observability AI Insights.
 *
 * When Model Settings is enabled and SIEP has endpoints configured for
 * the AI Insights feature, uses the first configured endpoint.
 * Otherwise falls back to getDefaultConnectorId + inference plugin.
 */
export async function resolveDefaultConnector({
  core,
  context,
  request,
  logger,
}: ResolveArgs): Promise<InferenceConnector> {
  const resolved = await loadEndpoints({ core, context, request, logger });

  if (resolved && resolved.endpoints.length > 0) {
    logger.debug(
      `[AI Insights resolver] Using SIEP endpoint: ${resolved.endpoints[0].connectorId}`
    );
    return resolved.endpoints[0];
  }

  if (resolved && resolved.endpoints.length === 0) {
    throw notFound(
      'No inference endpoints are configured for Observability AI Insights in this space.'
    );
  }

  const [coreStart, startDeps] = await core.getStartServices();
  const { inference } = startDeps;
  const connectorId = await getDefaultConnectorId({ coreStart, inference, request, logger });
  logger.debug(`[AI Insights resolver] Falling back to default connector: ${connectorId}`);
  return inference.getConnectorById(connectorId, request);
}

/**
 * Returns the connector list for Observability AI Insights.
 *
 * When Model Settings is enabled and inference endpoints are returned, returns only those.
 * Otherwise falls back to the full inference connector list.
 */
export async function resolveConnectorList({
  core,
  context,
  request,
  logger,
}: ResolveArgs): Promise<InferenceConnector[]> {
  const resolved = await loadEndpoints({ core, context, request, logger });

  if (resolved) {
    return resolved.endpoints;
  }

  const [, startDeps] = await core.getStartServices();
  const inferenceStart = startDeps.inference;
  return inferenceStart.getConnectorList(request);
}

async function loadEndpoints({
  core,
  context,
  request,
  logger,
}: ResolveArgs): Promise<ResolvedInferenceEndpoints | null> {
  const modelSettingsEnabled = await (
    await context.core
  ).uiSettings.client.get<boolean>(MODEL_SETTINGS_FEATURE_FLAG_ID);

  if (!modelSettingsEnabled) {
    logger.debug('[AI Insights resolver] Model Settings feature flag is OFF; falling back');
    return null;
  }

  logger.debug('[AI Insights resolver] Model Settings feature flag is ON');

  const [, startDeps] = await core.getStartServices();
  const siepStart = startDeps.searchInferenceEndpoints;

  if (!siepStart) {
    logger.debug(
      '[AI Insights resolver] searchInferenceEndpoints plugin unavailable; falling back'
    );
    return null;
  }

  try {
    const result = await siepStart.endpoints.getForFeature(
      OBSERVABILITY_AI_SETTINGS_SUBFEATURE_ID,
      request
    );
    result.warnings.forEach((w) => logger.warn(w));

    logger.debug(
      `[AI Insights resolver] getForFeature returned: soEntryFound=${
        result.soEntryFound
      }, endpoints=${result.endpoints.map((e) => e.connectorId).join(', ') || '(none)'}`
    );

    if (!result.soEntryFound) {
      logger.debug('[AI Insights resolver] No saved-object configuration found; falling back');
      return null;
    }

    return result;
  } catch (error) {
    logger.warn(
      `[AI Insights resolver] Failed to resolve inference endpoints: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw serverUnavailable(
      'Inference endpoint settings are temporarily unavailable. Try again shortly.'
    );
  }
}
