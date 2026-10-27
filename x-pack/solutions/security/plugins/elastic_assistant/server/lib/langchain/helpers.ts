/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  DefendInsightsPostRequestBody,
  PostAttackDiscoveryGenerateRequestBody,
  ExecuteConnectorRequestBody,
} from '@kbn/elastic-assistant-common';

export const requestHasRequiredAnonymizationParams = (
  request: KibanaRequest<
    unknown,
    unknown,
    | ExecuteConnectorRequestBody
    | PostAttackDiscoveryGenerateRequestBody
    | DefendInsightsPostRequestBody
  >
): boolean => {
  const { replacements } = request?.body ?? {};

  const replacementsIsValid =
    typeof replacements === 'object' &&
    Object.keys(replacements).every(
      (key) => typeof key === 'string' && typeof replacements[key] === 'string'
    );

  return replacementsIsValid;
};
