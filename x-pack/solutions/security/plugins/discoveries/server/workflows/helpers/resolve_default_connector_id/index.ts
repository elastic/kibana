/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';

// Sentinel stored in `genAiSettings:defaultAIConnector` when no default is configured.
const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

/**
 * Resolves the connector configured for a Feature settings feature, or `null` to
 * continue to the configured default.
 *
 * Deliberately returns `null` rather than deferring to `getForFeature` for an
 * unregistered id: `getForFeature` answers an unknown feature with its own
 * global-default and platform-default fallbacks, which would shadow the
 * `genAiSettings:defaultAIConnector` value this helper exists to honour. A tier
 * is often unregistered in practice, since the plugin that owns it may be
 * disabled.
 */
const resolveFeatureConnectorId = async ({
  featureId,
  logger,
  request,
  searchInferenceEndpoints,
}: {
  featureId: string;
  logger: Logger;
  request: KibanaRequest;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
}): Promise<string | null> => {
  if (searchInferenceEndpoints == null) {
    logger.debug(() => `searchInferenceEndpoints unavailable, ignoring feature_id ${featureId}`);

    return null;
  }

  const feature = searchInferenceEndpoints.features.get(featureId);

  if (feature == null) {
    logger.debug(() => `Feature ${featureId} is not registered, ignoring feature_id`);

    return null;
  }

  // Generation needs a chat completion model. An embedding or rerank feature is a
  // wiring mistake rather than an operator choice, so it is logged loudly instead
  // of being passed down to fail inside the LLM call.
  if (feature.taskType !== 'chat_completion') {
    logger.warn(
      `Ignoring feature_id ${featureId}: task type is ${feature.taskType}, not chat_completion`
    );

    return null;
  }

  // `onlyReturnConfigured` keeps the answer to "what did the operator pick for this
  // tier". The default mode appends the whole connector catalog behind the
  // recommendations and moves the platform default to the front when none of them are
  // provisioned, so `endpoints[0]` would be an unrelated connector and the list would
  // never come back empty, making the fallback below unreachable.
  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(featureId, request, {
    onlyReturnConfigured: true,
  });

  if (endpoints.length === 0) {
    logger.debug(() => `Feature ${featureId} resolved no endpoints, ignoring feature_id`);

    return null;
  }

  logger.debug(() => `Resolved connector ${endpoints[0].connectorId} from feature ${featureId}`);

  return endpoints[0].connectorId;
};

/**
 * Resolves the effective default connector id for workflow-engine surfaces that
 * do not carry an explicit `connector_id`.
 *
 * Resolution order:
 * 1. `featureId`, when it names a registered `chat_completion` feature in Model
 *    Management > Feature settings. Lets a step pick a tier without naming an
 *    endpoint.
 * 2. `genAiSettings:defaultAIConnector` (request-scoped uiSettings). The
 *    `NO_DEFAULT_CONNECTOR` sentinel and empty values are treated as unset.
 * 3. `inference.getDefaultConnector(request)` fallback.
 *
 * Throws a clean error when no source yields a connector.
 */
export const resolveDefaultConnectorId = async ({
  featureId,
  inference,
  logger,
  request,
  searchInferenceEndpoints,
  uiSettingsClient,
}: {
  featureId?: string;
  inference?: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  uiSettingsClient: IUiSettingsClient;
}): Promise<string> => {
  if (featureId) {
    const featureConnectorId = await resolveFeatureConnectorId({
      featureId,
      logger,
      request,
      searchInferenceEndpoints,
    });

    if (featureConnectorId != null) {
      return featureConnectorId;
    }
  }

  const configuredConnectorId = await uiSettingsClient.get<string>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
  );

  if (configuredConnectorId && configuredConnectorId !== NO_DEFAULT_CONNECTOR) {
    logger.debug(
      () =>
        `Resolved default connector ${configuredConnectorId} from ${GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR}`
    );

    return configuredConnectorId;
  }

  if (inference != null) {
    const defaultConnector = await inference.getDefaultConnector(request);

    if (defaultConnector != null) {
      logger.debug(
        () =>
          `Resolved default connector ${defaultConnector.connectorId} via inference.getDefaultConnector`
      );

      return defaultConnector.connectorId;
    }
  }

  throw new Error(
    `Unable to resolve a default AI connector: configure ${GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR} or a default inference connector, set a model for the feature, or provide connector_id explicitly.`
  );
};
