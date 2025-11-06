/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../../common/search_strategy';
import type { EntityAnalyticsSubPlugin } from './types';

// Helper function moved from the original file
const getEntityStoreIndexPattern = (entityType: EntityType, spaceId: string) =>
  `.entities.v1.latest.security_${entityType}_${spaceId}`;

export const getEntityStoreSubPlugin: EntityAnalyticsSubPlugin = async (
  entityType: EntityType,
  { spaceId }
) => {
  return `This is a set of rules that you must follow strictly:
  * Use the entity store index pattern: ${getEntityStoreIndexPattern(entityType, spaceId)}.
  * When searching the entity store for '${entityType}' you **MUST ALWAYS** filter by: 'where entity.EngineMetadata.Type == "${entityType}" OR entity.type == "${entityType}"'.
  `;
};
