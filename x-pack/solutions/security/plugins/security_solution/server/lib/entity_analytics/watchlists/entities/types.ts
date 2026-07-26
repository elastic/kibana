/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/entity-store/common';

/** Maps a correlation field value (e.g., "jdoe") to its EUID and entity type in the entity store */
export interface CorrelationEntry {
  euids: string[];
  entityType: EntityType;
}

/** Correlation field value -> entity store EUIDs + type. Used for index source sync. */
export type CorrelationMap = Map<string, CorrelationEntry>;

export interface WatchlistEntityDoc {
  '@timestamp'?: string;
  entity: {
    id: string;
    name?: string;
    type: EntityType;
  };
  labels?: {
    sources?: string[];
    source_ids?: string[];
  };
}
