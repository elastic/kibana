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

export interface EntitiesStats {
  doc_count: number;
  last_doc_timestamp: string;
}
export interface EntitiesTypeStats {
  entity_type: string;
  doc_count: number;
  last_doc_timestamp: string;
}

export interface EntityStoreStats {
  entity_store: string;
  doc_count: number;
  last_doc_timestamp: string;
}

export interface EntitySourceStats {
  entity_source: string;
  doc_count: number;
  last_doc_timestamp: string;
}

export interface AssetCriticalityStats {
  criticality: string;
  doc_count: number;
  last_doc_timestamp: string;
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
