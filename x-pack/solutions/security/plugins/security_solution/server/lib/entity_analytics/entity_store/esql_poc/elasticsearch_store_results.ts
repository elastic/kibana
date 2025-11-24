/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import { engineDescriptionRegistry } from '../installation/engine_description';
import { generateLatestIndex } from './latest_index';

export async function storeEntityStoreDocs(
  esClient: ElasticsearchClient,
  entityType: EntityType,
  namespace: string,
  items: Record<string, unknown>[]
): Promise<void> {
  if (items.length === 0) return;

  const { identityField } = engineDescriptionRegistry[entityType];
  const index = generateLatestIndex(entityType, namespace);

  const body = items.flatMap((doc) => [{ index: { _index: index, _id: doc[identityField] } }, doc]);

  await esClient.bulk({
    index,
    refresh: true,
    body,
  });
}
