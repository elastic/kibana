/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ENTITY_PRIORITY_UPDATES,
  ENTITY_SCHEMA_VERSION_V1,
  entitiesIndexPattern,
} from '@kbn/entities-schema/src/schema/v1/patterns';
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store';
import { createEntityIndex, deleteEntityIndex } from './entity_index';

export const createEntityPriorityUpdateIndex = async (
  entityType: EntityType,
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) => {
  await createEntityIndex({
    entityType,
    esClient,
    namespace,
    logger,
    indexName: getEntityPriorityUpdateIndexName(entityType, namespace),
  });
};

export const deleteEntityPriorityUpdateIndex = async (
  entityType: EntityType,
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) => {
  return deleteEntityIndex({
    entityType,
    esClient,
    namespace,
    logger,
    indexName: getEntityPriorityUpdateIndexName(entityType, namespace),
  });
};

export const getEntityPriorityUpdateIndexName = (type: EntityType, namespace: string): string => {
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_PRIORITY_UPDATES,
    definitionId: `security_${type}_${namespace}`,
  });
};
