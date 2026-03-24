/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
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

export const initEntityUpdatesDataStream = async (
  entityType: EntityType,
  esClient: ElasticsearchClient,
  namespace: string
) => {
  await esClient.indices.createDataStream({
    name: getEntityUpdatesDataStreamName(entityType, namespace),
  });
};

export const deleteEntityUpdatesDataStreams = async (
  entityType: EntityType,
  esClient: ElasticsearchClient,
  namespace: string
) => {
  await esClient.indices.deleteDataStream(
    {
      name: getEntityUpdatesDataStreamName(entityType, namespace),
    },
    {
      ignore: [404],
    }
  );
};

export const getEntityUpdatesDataStreamStatus = async (
  entityType: EntityType,
  esClient: ElasticsearchClient,
  namespace: string
): Promise<EngineComponentStatus> => {
  const index = getEntityUpdatesDataStreamName(entityType, namespace);
  const resp = await esClient.indices.getDataStream(
    {
      name: index,
    },
    {
      ignore: [404],
    }
  );

  const exists = resp.data_streams?.length > 0;

  return { id: index, installed: exists, resource: EngineComponentResourceEnum.data_stream };
};

export const getEntityUpdatesDataStreamName = (type: EntityType, namespace: string): string => {
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_UPDATES,
    definitionId: `security_${type}_${namespace}`,
  });
};
