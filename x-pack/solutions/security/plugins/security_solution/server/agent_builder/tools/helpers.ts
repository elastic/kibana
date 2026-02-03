/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { DEFAULT_SPACE_ID, getSpaceIdFromPath } from '@kbn/spaces-plugin/common';

/**
 * Gets the space ID from the request path.
 * Falls back to 'default' if no space ID is found in the path.
 */
export const getSpaceIdFromRequest = (request: KibanaRequest): string => {
  const pathname = request.url.pathname;
  const { spaceId } = getSpaceIdFromPath(pathname);
  return spaceId ?? DEFAULT_SPACE_ID;
};

export type EntityTypeForRisk = 'host' | 'user' | 'service' | 'generic';

/**
 * Gets the field prefix for risk data based on entity type.
 * Risk data is stored under different paths depending on the entity type:
 * - user: user.risk
 * - host: host.risk
 * - service: service.risk
 * - generic: entity.risk
 */
export const getRiskFieldPrefix = (entityType: EntityTypeForRisk): string => {
  return entityType === 'generic' ? 'entity' : entityType;
};

/**
 * Extracts risk data from an entity document based on entity type.
 * Risk data is stored under entity-type-specific paths:
 * - user.risk.calculated_level, user.risk.calculated_score_norm
 * - host.risk.calculated_level, host.risk.calculated_score_norm
 * - service.risk.calculated_level, service.risk.calculated_score_norm
 * - entity.risk.calculated_level, entity.risk.calculated_score_norm (for generic)
 */
export const getRiskDataFromEntity = (
  entity: Record<string, unknown>,
  entityType: EntityTypeForRisk
): Record<string, unknown> | undefined => {
  const prefix = getRiskFieldPrefix(entityType);
  const entityTypeData = entity[prefix] as Record<string, unknown> | undefined;
  return entityTypeData?.risk as Record<string, unknown> | undefined;
};
