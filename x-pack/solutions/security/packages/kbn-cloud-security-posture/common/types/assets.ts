/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents the properties of an asset/entity in the system
 */
export interface AssetProps {
  '@timestamp': string;
  'cloud.account.id': string;
  'cloud.account.name': string;
  'cloud.provider': string;
  'cloud.region': string;
  'cloud.service.name': string;
  'entity.EngineMetadata.Type': string;
  'entity.id': string;
  'entity.name': string;
  'entity.source': string;
  'entity.type': string;
  'event.ingested': string;
  [key: string]: any; // For any additional fields
}

/**
 * Simplified version of asset properties used in graph node responses
 * This is intentionally simplified to only expose the essential entity name field
 */
export interface MappedAssetProps {
  entityName: string;
}
