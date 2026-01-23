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
  | 'Asset Criticality'
  | 'Asset Inventory Cloud Connector Usage'
  | 'Asset Inventory Installation';

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

export interface AssetInventoryCloudConnectorUsageStats {
  id: string;
  created_at: string;
  updated_at: string;
  hasCredentials: boolean;
  cloud_provider: string;
  account_type?: 'single-account' | 'organization-account';
  packagePolicyIds: string[];
  packagePolicyCount: number;
}

export interface AssetInventoryInstallationStats {
  package_policy_id: string;
  package_name: string;
  package_version: string;
  created_at: string;
  agent_policy_id: string;
  agent_count: number;
  is_agentless: boolean;
  supports_cloud_connector: boolean;
  cloud_connector_id: string | null;
}

export interface AssetInventoryUsage {
  entities: EntitiesStats;
  entities_type_stats: EntitiesTypeStats[];
  entity_store_stats: EntityStoreStats[];
  entity_source_stats: EntitySourceStats[];
  asset_criticality_stats: AssetCriticalityStats[];
  asset_inventory_cloud_connector_usage_stats: AssetInventoryCloudConnectorUsageStats[];
  asset_inventory_installation_stats: AssetInventoryInstallationStats[];
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
