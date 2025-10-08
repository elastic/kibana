/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AssetInventoryUsageCollectorType =
  | 'Entities'
  | 'Entities Type'
  | 'Entity Store'
  | 'Entity Source'
  | 'Asset Criticality';

interface BaseStats {
  doc_count: number;
  last_doc_timestamp: string;
}

export type EntitiesStats = BaseStats;

export interface EntitiesTypeStats extends BaseStats {
  entity_type: string;
}

export interface EntityStoreStats extends BaseStats {
  entity_store: string;
}

export interface EntitySourceStats extends BaseStats {
  entity_source: string;
}

export interface AssetCriticalityStats extends BaseStats {
  criticality: string;
}

export interface AssetInventoryUsage {
  entities: EntitiesStats;
  entities_type_stats: EntitiesTypeStats[];
  entity_store_stats: EntityStoreStats[];
  entity_source_stats: EntitySourceStats[];
  asset_criticality_stats: AssetCriticalityStats[];
}

/**
 * Bucket structure returned from Elasticsearch aggregation.
 */
export interface AggregationBucket {
  key: string;
  doc_count: number;
  last_doc_timestamp: {
    value: number;
    value_as_string: string;
  };
}

/**
 * Expected structure passed to the parser.
 */
export interface AggregationOnlyResponse {
  buckets: AggregationBucket[];
}
