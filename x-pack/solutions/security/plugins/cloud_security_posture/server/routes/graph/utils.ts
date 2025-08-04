/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityTypeMappings } from './entity_type_constants';

/**
 * Transforms entity type values to standardized icon names
 * This helps normalize different entity type representations to consistent icon names
 *
 * @param entityType The entity type value to transform
 * @returns The standardized icon name
 */
export const transformEntityTypeToIcon = (entityType: string | undefined): string | undefined => {
  if (!entityType) {
    return undefined;
  }

  const entityTypeLower = entityType.toLowerCase();

  return entityTypeMappings[entityTypeLower] ?? undefined;
};
