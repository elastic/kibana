/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import type { ElasticsearchClient, Logger, SecurityServiceStart } from '@kbn/core/server';

const INSUFFICIENT_INDEX_PRIVILEGES_ERROR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.api.insufficientIndexPrivileges',
  {
    defaultMessage: 'Insufficient privileges to read from the selected index pattern.',
  }
);

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
