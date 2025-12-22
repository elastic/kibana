/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

/**
 * Gets the default connector ID by first checking the UI settings (genAI settings),
 * then falling back to the inference plugin's default connector.
 */
export async function getDefaultConnectorId({
  coreStart,
  inference,
  request,
  logger,
}: {
  coreStart: CoreStart;
  inference: InferenceServerStart;
  request: KibanaRequest;
  logger?: Logger;
}): Promise<string> {
  const soClient = coreStart.savedObjects.getScopedClient(request);
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);

  const defaultConnectorSetting = await uiSettingsClient.get<string | undefined>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
  );

  const hasValidDefaultConnector =
    defaultConnectorSetting && defaultConnectorSetting !== NO_DEFAULT_CONNECTOR;

  if (hasValidDefaultConnector) {
    logger?.debug(`Using default AI connector from UI setting: ${defaultConnectorSetting}`);
    return defaultConnectorSetting;
  }

  const connectorId = (await inference.getDefaultConnector(request))?.connectorId;

  if (!connectorId) {
    throw new Error('No AI connector configured.');
  }

  logger?.debug(`Using default connector from inference plugin: ${connectorId}`);
  return connectorId;
}
