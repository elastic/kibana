/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';

export const grantEntitySourceApiKey = async (
  security: SecurityServiceStart,
  request: KibanaRequest,
  source: { id: string; name: string }
): Promise<{ apiKeyId: string; apiKey: string } | null> => {
  const result = await security.authc.apiKeys.grantAsInternalUser(request, {
    name: `watchlist-entity-source: ${source.name}`,
    role_descriptors: {},
    metadata: {
      description: 'API key used to scope watchlist entity source index sync',
      sourceId: source.id,
    },
  });

  if (!result) return null;
  return { apiKeyId: result.id, apiKey: result.api_key };
};

export const checkIndexReadPrivilege = async (
  esClient: ElasticsearchClient,
  indexPattern: string
): Promise<boolean> => {
  const response = await esClient.security.hasPrivileges({
    index: [{ names: [indexPattern], privileges: ['read'] }],
  });
  return response.index[indexPattern]?.read ?? false;
};

export const invalidateEntitySourceApiKey = async (
  security: SecurityServiceStart,
  apiKeyId: string,
  logger: Logger
): Promise<void> => {
  try {
    await security.authc.apiKeys.invalidateAsInternalUser({ ids: [apiKeyId] });
  } catch (err) {
    logger.warn(
      `[WatchlistSync] Failed to invalidate API key ${apiKeyId}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};
