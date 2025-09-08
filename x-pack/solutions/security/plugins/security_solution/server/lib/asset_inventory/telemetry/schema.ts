/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { AssetInventoryUsage } from './type';

export const assetInventoryUsageSchema: MakeSchemaFrom<AssetInventoryUsage> = {
  entities: {
    doc_count: {
      type: 'long',
    },
    last_doc_timestamp: {
      type: 'date',
    },
  },
  entities_type_stats: {
    type: 'array',
    items: {
      entity_type: { type: 'keyword' },
      doc_count: { type: 'long' },
      last_doc_timestamp: { type: 'date' },
    },
  },
  entity_store_stats: {
    type: 'array',
    items: {
      entity_store: { type: 'keyword' },
      doc_count: { type: 'long' },
      last_doc_timestamp: { type: 'date' },
    },
  },
  entity_source_stats: {
    type: 'array',
    items: {
      entity_source: { type: 'keyword' },
      doc_count: { type: 'long' },
      last_doc_timestamp: { type: 'date' },
    },
  },
  asset_criticality_stats: {
    type: 'array',
    items: {
      criticality: { type: 'keyword' },
      doc_count: { type: 'long' },
      last_doc_timestamp: { type: 'date' },
    },
  },
};
