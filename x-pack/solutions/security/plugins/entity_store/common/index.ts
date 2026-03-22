/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lightweight `@kbn/entity-store/common` barrel (webpack `common` entry).
 * Keeps page-load size small: no euid / streamlang here — use `./library` or `loadEuidApi()`.
 *
 * @example
 * import { euid, type EntityType } from '@kbn/entity-store/common/library';
 */

export type { EntityStoreStatus, EntityType, IdentitySourceFields, Entity } from './constants';
export {
  PLUGIN_ID,
  PLUGIN_NAME,
  FF_ENABLE_ENTITY_STORE_V2,
  ENTITY_STORE_ROUTES,
  getErrorMessage,
  ALL_ENTITY_TYPES,
} from './constants';

export type { NonEcsTimelineDataRow } from './domain/euid/non_ecs_timeline_data';

export {
  ENTITY_LATEST,
  ENTITY_UPDATES,
  ENTITY_HISTORY,
  ENTITY_BASE_PREFIX,
  ENTITY_SCHEMA_VERSION_V2,
  getEntityIndexPattern,
  getEntitiesAliasPattern,
  getLatestEntitiesIndexName,
} from './domain/entity_index';
