/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import {
  EngineComponentResourceEnum,
  type EngineComponentStatus,
  type EntityType,
} from '../../../../../common/api/entity_analytics';
import { getEntitiesIndexName } from '../utils';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';

import type { EntityEngineInstallationDescriptor } from '../installation/types';

interface Options {
  entityType: EntityType;
  esClient: ElasticsearchClient;
  namespace: string;
  logger: Logger;
}

export const createEntityIndex = async ({ entityType, esClient, namespace, logger }: Options) => {
  await createOrUpdateIndex({
    esClient,
    logger,
    options: {
      index: getEntitiesIndexName(entityType, namespace),
    },
  });
};

export const deleteEntityIndex = ({ entityType, esClient, namespace }: Options) =>
  esClient.indices.delete(
    {
      index: getEntitiesIndexName(entityType, namespace),
    },
    {
      ignore: [404],
    }
  );

export const getEntityIndexStatus = async ({
  entityType,
  esClient,
  namespace,
}: Pick<Options, 'entityType' | 'namespace' | 'esClient'>): Promise<EngineComponentStatus> => {
  const index = getEntitiesIndexName(entityType, namespace);
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

export type MappingProperties = NonNullable<MappingTypeMapping['properties']>;

export const generateIndexMappings = (
  description: Pick<EntityEngineInstallationDescriptor, 'fields' | 'identityField'>
): MappingTypeMapping => {
  const identityFieldMappings: MappingProperties = {
    [description.identityField]: {
      type: 'keyword',
      fields: {
        text: {
          type: 'match_only_text',
        },
      },
    },
  };

  const otherFieldMappings = description.fields
    .filter(({ mapping }) => mapping)
    .reduce((acc, { destination, mapping }) => {
      acc[destination] = mapping;
      return acc;
    }, {} as MappingProperties);

  return {
    properties: { ...BASE_ENTITY_INDEX_MAPPING, ...identityFieldMappings, ...otherFieldMappings },
  };
};

export const BASE_ENTITY_INDEX_MAPPING: MappingProperties = {
  '@timestamp': {
    type: 'date',
  },
  'asset.criticality': {
    type: 'keyword',
  },
  'entity.name': {
    type: 'keyword',
    fields: {
      text: {
        type: 'match_only_text',
      },
    },
  },
  'entity.source': {
    type: 'keyword',
  },
};
