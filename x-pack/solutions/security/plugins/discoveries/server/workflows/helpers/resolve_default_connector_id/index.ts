/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

// Sentinel stored in `genAiSettings:defaultAIConnector` when no default is configured.
const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

/**
 * Resolves the effective default connector id for workflow-engine surfaces that
 * do not carry an explicit `connector_id`.
 *
 * Resolution order:
 * 1. `genAiSettings:defaultAIConnector` (request-scoped uiSettings). The
 *    `NO_DEFAULT_CONNECTOR` sentinel and empty values are treated as unset.
 * 2. `inference.getDefaultConnector(request)` fallback.
 *
 * Throws a clean error when neither source yields a connector.
 */
export const resolveDefaultConnectorId = async ({
  inference,
  logger,
  request,
  uiSettingsClient,
}: {
  inference?: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
}): Promise<string> => {
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
    `Unable to resolve a default AI connector: configure ${GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR} or a default inference connector, or provide connector_id explicitly.`
  );
};
