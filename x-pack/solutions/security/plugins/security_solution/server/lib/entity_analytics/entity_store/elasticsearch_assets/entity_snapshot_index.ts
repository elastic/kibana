/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import {
  EngineComponentResourceEnum,
  type EngineComponentStatus,
  type EntityType,
} from '../../../../../common/api/entity_analytics';
import { getEntitiesSnapshotIndexName } from '../utils';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';

import type { EntityEngineInstallationDescriptor } from '../installation/types';

interface Options {
  entityType: EntityType;
  esClient: ElasticsearchClient;
  snapshotDate: Date,
  namespace: string;
}

export const createEntitySnapshotIndex = async ({ entityType, esClient, snapshotDate, namespace }: Options) =>
  esClient.indices.create({
      index: getEntitiesSnapshotIndexName(entityType, snapshotDate, namespace),
  });

export const deleteEntitySnapshotIndex = ({ entityType, esClient, snapshotDate, namespace }: Options) =>
  esClient.indices.delete(
    {
      index: getEntitiesSnapshotIndexName(entityType, snapshotDate, namespace),
    },
    {
      ignore: [404],
    }
  );

