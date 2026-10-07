/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

const INSUFFICIENT_INDEX_PRIVILEGES_ERROR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.api.insufficientIndexPrivileges',
  {
    defaultMessage: 'Insufficient privileges to read from the selected index pattern.',
  }
);

export const grantEntitySourceApiKey = async (
  securityService: SecurityServiceStart,
  request: KibanaRequest,
  sourceName?: string
) => {
  // `getCurrentUser().authentication_type` is the primary signal, but it can fail to resolve for
  // fake requests (e.g. Agent Builder tool calls run via Task Manager with a stored API key),
  // silently leaving `authentication_type` undefined even though the request is genuinely
  // API-key authenticated. Fall back to the raw Authorization header scheme, which is always
  // present on these requests.
  const isApiKeyAuthentication = () => {
    const user = securityService.authc.getCurrentUser(request);
    if (user?.authentication_type) {
      return user.authentication_type === 'api_key';
    }
    return HTTPAuthorizationHeader.parseFromRequest(request)?.scheme.toLowerCase() === 'apikey';
  };

  const keyName = sourceName ? `watchlist-entity-source:${sourceName}` : 'watchlist-entity-source';
  const metadata = {
    description: 'API key used to scope watchlist entity source index sync.',
    managed: true,
  };

  // The grant endpoint only supports password/access_token auth and throws on API key auth
  // (the case in serverless). Use cloneAsInternalUser when the request uses API key auth.
  if (isApiKeyAuthentication()) {
    const result = await securityService.authc.apiKeys.cloneAsInternalUser(request, {
      name: keyName,
      metadata,
    });
    if (!result) return;
    return { apiKeyId: result.id, apiKey: result.api_key };
  }

  const result = await securityService.authc.apiKeys.grantAsInternalUser(request, {
    name: keyName,
    role_descriptors: {},
    metadata,
  });
  if (!result) return;
  return { apiKeyId: result.id, apiKey: result.api_key };
};

export const validateIndexPermissions = async (
  esClient: ElasticsearchClient,
  indexPattern: string
) => {
  const response = await esClient.security.hasPrivileges({
    index: [{ names: [indexPattern], privileges: ['read'] }],
  });
  const hasPrivilege = response.index[indexPattern]?.read ?? false;

  if (!hasPrivilege) {
    throw Boom.forbidden(INSUFFICIENT_INDEX_PRIVILEGES_ERROR);
  }
};

export const invalidateEntitySourceApiKey = async (
  securityService: SecurityServiceStart,
  apiKeyId: string,
  logger: Logger
) => {
  try {
    await securityService.authc.apiKeys.invalidateAsInternalUser({ ids: [apiKeyId] });
  } catch (err) {
    logger.warn(
      `[WatchlistSync] Failed to invalidate API key ${apiKeyId}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};
