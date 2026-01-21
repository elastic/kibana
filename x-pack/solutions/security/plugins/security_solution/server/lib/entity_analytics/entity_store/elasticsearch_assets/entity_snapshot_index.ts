/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type EntityType,
  type EngineComponentStatus,
  EngineComponentResourceEnum,
} from '../../../../../common/api/entity_analytics';
import { getEntitiesSnapshotIndexName, getEntitiesSnapshotIndexPattern } from '../utils';

interface Options {
  entityType: EntityType;
  esClient: ElasticsearchClient;
  snapshotDate: Date;
  namespace: string;
}

interface DeleteAllOptions {
  entityType: EntityType;
  esClient: ElasticsearchClient;
  namespace: string;
}

export async function createEntitySnapshotIndex({
  entityType,
  esClient,
  snapshotDate,
  namespace,
}: Options) {
  return esClient.indices.create(
    {
      index: getEntitiesSnapshotIndexName(entityType, snapshotDate, namespace),
    },
    {
      ignore: [409],
    }
  );
}

export async function deleteAllEntitySnapshotIndices({
  entityType,
  esClient,
  namespace,
}: DeleteAllOptions) {
  const response = await esClient.indices.get({
    index: getEntitiesSnapshotIndexPattern(entityType, namespace),
    expand_wildcards: 'all',
  });
  const indexNames = Object.keys(response);
  const promises = indexNames.map((name) =>
    esClient.indices.delete(
      {
        index: name,
        ignore_unavailable: true,
      },
      {
        ignore: [404],
      }
    )
  );
  await Promise.all(promises);
}

export const getEntitySnapshotIndexStatus = async ({
  entityType,
  esClient,
  namespace,
}: Pick<Options, 'entityType' | 'namespace' | 'esClient'>): Promise<
  Array<EngineComponentStatus>
> => {
  const indexPattern = getEntitiesSnapshotIndexPattern(entityType, namespace);
  const response = await esClient.indices.get(
    {
      index: indexPattern,
      expand_wildcards: 'all',
    },
    {
      ignore: [404],
    }
  );

  const result = Object.keys(response).map((indexId) => ({
    id: indexId,
    installed: true,
    resource: EngineComponentResourceEnum.index,
  }));

  return result;
};
