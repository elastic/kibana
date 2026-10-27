/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import type { EntityInventoryEntityType } from '../types';

export const ENTITY_INVENTORY_APP_NAME = 'entityInventoryApp';

export const ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS = 3;

export const DEFAULT_TIME_RANGE: TimeRange = { from: 'now-15m', to: 'now' };

export interface EntityInventoryPage {
  entityType: EntityInventoryEntityType;
  path: string;
}

/** One routed page per entity type. Paths match the deep links registered in `plugin.tsx`. */
export const ENTITY_PAGES: readonly EntityInventoryPage[] = [
  { entityType: 'all', path: '/all-resources' },
  { entityType: 'hosts', path: '/hosts' },
  { entityType: 'kubernetes', path: '/kubernetes' },
];

export const DEFAULT_ENTITY_PAGE_PATH = ENTITY_PAGES[0].path;
