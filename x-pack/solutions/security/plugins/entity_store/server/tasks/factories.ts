/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type { EntityStoreStartPlugins } from '../types';
import { LogsExtractionClient } from '../domain/logs_extraction_client';
import { getApiKeyManager } from '../infra/auth';

export interface LogsExtractionClientFactoryResult {
  logsExtractionClient: LogsExtractionClient;
  apiKey: { id: string; name: string; apiKey: string };
}

/**
 * Factory function to create a LogsExtractionClient with all required dependencies.
 * This handles the boilerplate of:
 * - Getting the API key manager
 * - Retrieving the API key
 * - Creating clients from the API key
 * - Creating the dataViewsService
 * - Instantiating the LogsExtractionClient
 *
 * @param params - Factory parameters
 * @returns LogsExtractionClient and API key, or null if API key is not found
 */
export async function createLogsExtractionClient({
  core,
  plugins,
  logger,
  namespace,
}: {
  core: CoreStart;
  plugins: EntityStoreStartPlugins;
  logger: Logger;
  namespace: string;
}): Promise<LogsExtractionClientFactoryResult | null> {
  // Get API key manager
  const apiKeyManager = getApiKeyManager({
    core,
    logger,
    security: plugins.security,
    encryptedSavedObjects: plugins.encryptedSavedObjects,
    namespace,
  });

  // Get API key
  const apiKey = await apiKeyManager.getApiKey();

  if (!apiKey) {
    logger.warn(`No API key found, cannot create LogsExtractionClient for namespace: ${namespace}`);
    return null;
  }

  // Get clients from API key
  const { clusterClient, soClient } = await apiKeyManager.getClientFromApiKey(apiKey);
  const internalUserClient = core.elasticsearch.client.asInternalUser;

  // Create dataViewsService with proper clients
  const dataViewsService = await plugins.dataViews.dataViewsServiceFactory(
    soClient,
    internalUserClient
  );

  // Create LogsExtractionClient with proper initialization
  const logsExtractionClient = new LogsExtractionClient(
    logger,
    namespace,
    clusterClient.asCurrentUser,
    dataViewsService
  );

  return {
    logsExtractionClient,
    apiKey,
  };
}
