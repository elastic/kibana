/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityContainer } from '../../../../common/api/entity_analytics/entity_store/entities/upsert_entities_bulk.gen';
import type { EntityType } from '../../../../common/entity_analytics/types';

export const DEFAULT_TIME_FIELD = '@timestamp';
export const DEFAULT_LOOKBACK_WINDOW = '30d';

export interface EntityMaintainer {
  id: string;
  defaults: {
    input: string;
    lookbackWindow: string;
    timeField: string;
  };
  entityTypes: EntityType[];
  getCompositeQuery: (timeField?: string, lookbackInterval?: string) => QueryDslQueryContainer;
  getQuery: (index: string, entityType: EntityType, rangeClause: string) => string;
  formatRecord?: (record: Record<string, unknown>) => Record<string, unknown>;
  postProcessRecords?: (records: EntityContainer[]) => void;
}

export type EntityMaintainerConfig = Pick<EntityMaintainer, 'id'> & {
  input: string;
  schedule: { interval: string };
  enabled: boolean;
  pageSize: number;
  timeField: string;
  lookbackWindow: string;
};
