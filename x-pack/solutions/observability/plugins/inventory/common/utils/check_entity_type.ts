/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BUILT_IN_ENTITY_TYPES } from '@kbn/observability-shared-plugin/common';
import type { InventoryEntity } from '../entities';

export const isBuiltinEntityOfType = (
  type: (typeof BUILT_IN_ENTITY_TYPES)[keyof typeof BUILT_IN_ENTITY_TYPES],
  entity: InventoryEntity
): boolean => {
  return entity.entityType === type;
};
