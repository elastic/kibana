/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetMitreEntitiesRequestParams } from '@kbn/security-mitre-attack-common';

/**
 * Serializes query params for GET /internal/mitre/entities.
 * Arrays are joined to comma-separated strings (matching the route's ArrayFromString schema).
 * Undefined fields are omitted so the server applies its schema defaults.
 */
export const buildMitreEntitiesQueryParams = (
  params: GetMitreEntitiesRequestParams
): Record<string, string> => {
  const query: Record<string, string> = {};
  if (params.framework !== undefined) {
    query.framework = params.framework;
  }
  if (params.framework_version !== undefined) {
    query.framework_version = params.framework_version;
  }
  if (params.types !== undefined && params.types.length > 0) {
    query.types = params.types.join(',');
  }
  if (params.status !== undefined) {
    query.status = params.status;
  }
  return query;
};
