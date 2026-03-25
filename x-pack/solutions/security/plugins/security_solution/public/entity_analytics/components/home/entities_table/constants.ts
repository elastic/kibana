/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoolQuery } from '@kbn/es-query';

export {
  ENTITY_ANALYTICS_TABLE_ID,
  ENTITY_ANALYTICS_LOCAL_STORAGE_COLUMNS_KEY,
  ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
  getLatestEntitiesIndexName,
} from '../constants';

export const MAX_ENTITIES_TO_LOAD = 500;
export const DEFAULT_VISIBLE_ROWS_PER_PAGE = 25;
export const DEFAULT_TABLE_SECTION_HEIGHT = 512;

export const QUERY_KEY_GRID_DATA = 'entity_analytics_grid_data';
export const QUERY_KEY_GROUPING_DATA = 'entity-analytics-grouping-data';
export const QUERY_KEY_ENTITY_ANALYTICS = 'entity-analytics-query-key';

const LOCAL_STORAGE_PREFIX = 'entityAnalytics';
export const LOCAL_STORAGE_COLUMNS_KEY = `${LOCAL_STORAGE_PREFIX}:columns`;
export const LOCAL_STORAGE_COLUMNS_SETTINGS_KEY = `${LOCAL_STORAGE_PREFIX}:columns:settings`;
export const LOCAL_STORAGE_GROUPING_KEY = `${LOCAL_STORAGE_PREFIX}:grouping`;

export const TEST_SUBJ_DATA_GRID = 'entity-analytics-test-subj-grid-wrapper';
export const TEST_SUBJ_EMPTY_STATE = 'entity-analytics-empty-state';
export const TEST_SUBJ_GROUPING = 'entity-analytics-grouping';
export const TEST_SUBJ_GROUPING_LOADING = 'entity-analytics-grouping-loading';
export const TEST_SUBJ_GROUPING_COUNTER = 'entity-analytics-grouping-counter';

export const ENTITY_FIELDS = {
  ASSET_CRITICALITY: 'asset.criticality',
  ENTITY_ID: 'entity.id',
  ENTITY_NAME: 'entity.name',
  ENTITY_SOURCE: 'entity.source',
  ENTITY_TYPE: 'entity.EngineMetadata.Type',
  ENTITY_RISK: 'entity.risk.calculated_score_norm',
  RESOLVED_TO: 'entity.relationships.resolution.resolved_to',
  TIMESTAMP: '@timestamp',
} as const;

export const ENTITY_GROUPING_OPTIONS = {
  NONE: 'none',
  ENTITY_TYPE: ENTITY_FIELDS.ENTITY_TYPE,
};

export const ALLOWED_ENTITY_TYPES = ['user', 'host', 'service'] as const;

export const ENTITY_TYPE_FILTER = {
  bool: {
    filter: [{ terms: { [ENTITY_FIELDS.ENTITY_TYPE]: [...ALLOWED_ENTITY_TYPES] } }],
  } as unknown as BoolQuery,
};
