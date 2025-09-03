/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store';
import { createEntityIndex, deleteEntityIndex } from './entity_index';

export const createEntityPriorityUpdateIndex = async (
  entityType: EntityType,
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) => {
  return createEntityIndex({
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
  return `.entity-store.${type}-priority-update-${namespace}`;
};
