/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, IScopedClusterClient, Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import type { Entity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { EntityStoreDataClient } from './entity_store_data_client';
import { BadCRUDRequestError, DocumentNotFoundError, EngineNotRunningError } from './errors';
import { getEntitiesIndexName } from './utils';
import { buildUpdateEntityPainlessScript } from './painless/build_update_script';
import { getEntityUpdatesIndexName } from './elasticsearch_assets/updates_entity_index';
import type { FlattenProps } from './utils/flatten_props';
import { flattenProps } from './utils/flatten_props';

interface EntityStoreClientOpts {
  logger: Logger;
  namespace: string;
  clusterClient: IScopedClusterClient;
  dataClient: EntityStoreDataClient;
}

const nonForcedAttributesPath = [
  ['entity', 'id'],
  ['entity', 'attributes', '*'],
  ['entity', 'lifecycle', '*'],
  ['entity', 'behavior', '*'],
];

export class EntityStoreCrudClient {
  private esClient: ElasticsearchClient;
  private namespace: string;
  private logger: Logger;
  private dataClient: EntityStoreDataClient;

  constructor({ clusterClient, namespace, logger, dataClient }: EntityStoreClientOpts) {
    this.esClient = clusterClient.asCurrentUser;
    this.namespace = namespace;
    this.logger = logger;
    this.dataClient = dataClient;
  }

  public async upsertEntity(type: EntityType, doc: Entity, force = false) {
    await this.assertEngineIsRunning(type);
    const flatProps = flattenProps(doc);

    if (!force) {
      assertOnlyNonForcedAttributesInReq(flatProps);
    }

    this.logger.info(`Updating entity '${doc.entity.id}' (type ${type})`);

    const painlessUpdate = buildUpdateEntityPainlessScript(flatProps);
    if (!painlessUpdate) {
      throw new BadCRUDRequestError(`The request doesn't contain any update`);
    }

    const updateByQueryResp = await this.esClient.updateByQuery({
      index: getEntitiesIndexName(type, this.namespace),
      query: {
        term: {
          'entity.id': doc.entity.id,
        },
      },
      script: {
        source: painlessUpdate,
        lang: 'painless',
      },
    });

    if ((updateByQueryResp.updated || 0) < 1) {
      throw new DocumentNotFoundError();
    }

    await this.esClient.create({
      id: uuidv4(),
      index: getEntityUpdatesIndexName(type, this.namespace),
      document: {
        '@timestamp': new Date().toISOString(),
        [type]: {
          name: doc.entity.id,
          entity: {
            ...doc.entity,
          },
        },
      },
    });
  }

  private async assertEngineIsRunning(type: EntityType) {
    const { engines, status } = await this.dataClient.status({ include_components: true });

    if (status !== 'running') {
      throw new EngineNotRunningError(type);
    }

    for (let i = 0; i < engines.length; i++) {
      if (engines[i].type === type) {
        if (engines[i].status === 'started') {
          return;
        }
      }
    }

    throw new EngineNotRunningError(type);
  }
}

function assertOnlyNonForcedAttributesInReq(flatProps: FlattenProps[]) {
  const notAllowedProps = [];
  for (let i = 0; i < flatProps.length; i++) {
    if (!isPropAllowed(flatProps[i])) {
      notAllowedProps.push(flatProps[i]);
    }
  }

  if (notAllowedProps.length > 0) {
    const notAllowedPropsString = notAllowedProps.map(({ path }) => path.join('.')).join(', ');
    throw new BadCRUDRequestError(
      `The following attributes are not allowed to be ` +
        `updated without forcing it (?force=true): ${notAllowedPropsString}`
    );
  }
}

function isPropAllowed(prop: FlattenProps) {
  for (let i = 0; i < nonForcedAttributesPath.length; i++) {
    const nonForcedPropPath = nonForcedAttributesPath[i];
    let isMatch = false;
    if (nonForcedPropPath[nonForcedPropPath.length - 1] === '*') {
      isMatch = isExactMatch(
        nonForcedPropPath.slice(0, -1),
        prop.path.slice(0, prop.path.length - nonForcedPropPath.length - 1)
      );
    } else {
      isMatch = isExactMatch(nonForcedPropPath, prop.path);
    }

    if (isMatch) {
      return true;
    }
  }

  return false;
}

function isExactMatch(arr1: string[], arr2: string[]) {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}
