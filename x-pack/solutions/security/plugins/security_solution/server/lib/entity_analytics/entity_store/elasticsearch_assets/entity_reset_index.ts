/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { type EntityType } from '../../../../../common/api/entity_analytics';
import { getEntitiesResetIndexName } from '../utils';

interface Options {
  entityType: EntityType;
  esClient: ElasticsearchClient;
  namespace: string;
}

// TODO(kuba): unused because in Entity Manager?
export async function createEntityResetIndex({ entityType, esClient, namespace }: Options) {
  return esClient.indices.create({
    index: getEntitiesResetIndexName(entityType, namespace),
  });
}

export function deleteEntityResetIndex({ entityType, esClient, namespace }: Options) {
  return esClient.indices.delete(
    {
      index: getEntitiesResetIndexName(entityType, namespace),
    },
    {
      ignore: [404],
    }
  );
}
