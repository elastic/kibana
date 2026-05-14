/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export const RELATIONSHIP_HISTORY_INDEX = 'entity-relationship-history';

export const RELATIONSHIP_HISTORY_MAPPING = {
  mappings: {
    properties: {
      entity_id: { type: 'keyword' as const },
      rel_type: { type: 'keyword' as const },
      target_euid: { type: 'keyword' as const },
      seen: { type: 'date' as const, format: 'strict_date_optional_time' },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
  },
};

export async function createRelationshipHistoryIndex(esClient: ElasticsearchClient) {
  const exists = await esClient.indices.exists({ index: RELATIONSHIP_HISTORY_INDEX });
  if (!exists) {
    await esClient.indices.create({
      index: RELATIONSHIP_HISTORY_INDEX,
      ...RELATIONSHIP_HISTORY_MAPPING,
    });
  }
}

export async function deleteRelationshipHistoryIndex(esClient: ElasticsearchClient) {
  await esClient.indices.delete({
    index: RELATIONSHIP_HISTORY_INDEX,
    ignore_unavailable: true,
  });
}
