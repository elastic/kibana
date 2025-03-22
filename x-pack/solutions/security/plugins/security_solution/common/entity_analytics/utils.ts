/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from './types';

const DISABLED_ENTITY_TYPES = [EntityType.generic];

export const getEntityAnalyticsEntityTypes = (): EntityType[] => {
  return Object.values(EntityType).filter(
    (entityType) => DISABLED_ENTITY_TYPES.indexOf(entityType) === -1
  );
};
