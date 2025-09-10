/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ENTITY_UPDATES,
  ENTITY_SCHEMA_VERSION_V1,
  entitiesIndexPattern,
} from '@kbn/entities-schema/src/schema/v1/patterns';
import type {
  EntityType,
  EngineComponentStatus,
} from '../../../../../common/api/entity_analytics/entity_store';
import { EngineComponentResourceEnum } from '../../../../../common/api/entity_analytics/entity_store';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';

export const createEntityUpdatesIndex = async (
  entityType: EntityType,
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) => {
  await createOrUpdateIndex({
    esClient,
    logger,
    options: {
      index: getEntityUpdatesIndexName(entityType, namespace),
    },
  });
};

export const deleteEntityUpdatesIndex = async (
  entityType: EntityType,
  esClient: ElasticsearchClient,
  namespace: string
) => {
  esClient.indices.delete(
    {
      index: getEntityUpdatesIndexName(entityType, namespace),
    },
    {
      ignore: [404],
    }
  );
};

export const getEntityUpdatesIndexStatus = async (
  entityType: EntityType,
  esClient: ElasticsearchClient,
  namespace: string
): Promise<EngineComponentStatus> => {
  const index = getEntityUpdatesIndexName(entityType, namespace);
  const exists = await esClient.indices.exists(
    {
      index,
    },
    {
      ignore: [404],
    }
  );
  return { id: index, installed: exists, resource: EngineComponentResourceEnum.index };
};

export const getEntityUpdatesIndexName = (type: EntityType, namespace: string): string => {
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_UPDATES,
    definitionId: `security_${type}_${namespace}`,
  });
};
