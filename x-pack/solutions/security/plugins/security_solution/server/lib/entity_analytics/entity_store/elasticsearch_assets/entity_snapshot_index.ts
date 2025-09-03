/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { type EntityType } from '../../../../../common/api/entity_analytics';
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
  return esClient.indices.create({
    index: getEntitiesSnapshotIndexName(entityType, snapshotDate, namespace),
  });
}

export async function deleteEntitySnapshotIndex({
  entityType,
  esClient,
  snapshotDate,
  namespace,
}: Options) {
  return esClient.indices.delete(
    {
      index: getEntitiesSnapshotIndexName(entityType, snapshotDate, namespace),
    },
    {
      ignore: [404],
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
  indexNames.forEach((name) => {
    esClient.indices.delete(
      {
        index: name,
        ignore_unavailable: true,
      },
      {
        ignore: [404],
      }
    );
  });
}
