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
import { getEntityPriorityUpdateIndexName } from './elasticsearch_assets/priority_update_entity_index';

interface EntityStoreClientOpts {
  logger: Logger;
  namespace: string;
  clusterClient: IScopedClusterClient;
  dataClient: EntityStoreDataClient;
}

const allowedEntityAttributes = ['id', 'attributes', 'lifecycle', 'behavior'];

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

  public async upsertEntity(type: EntityType, entityId: string, doc: Entity) {
    await this.assertEngineIsRunning(type);
    this.validEntityUpdate(doc, entityId);

    this.logger.info(`Updating entity '${entityId}' (type ${type})`);

    const painlessUpdate = buildUpdateEntityPainlessScript(doc);
    if (!painlessUpdate) {
      throw new BadCRUDRequestError(`The request doesn't contain any update`);
    }

    const updateByQueryResp = await this.esClient.updateByQuery({
      index: getEntitiesIndexName(type, this.namespace),
      query: {
        term: {
          'entity.id': entityId,
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
      index: getEntityPriorityUpdateIndexName(type, this.namespace),
      document: {
        '@timestamp': new Date().toISOString(),
        [type]: {
          name: entityId,
          entity: {
            ...doc.entity,
            Metadata: {
              priority: 1,
            },
          },
        },
      },
    });
  }

  private validEntityUpdate(doc: Entity, entityId: string) {
    if (entityId !== doc.entity.id) {
      throw new BadCRUDRequestError(
        `The id provided in the path, and the id provided in the body doesn't match`
      );
    }

    const notAllowedAttributes = [];
    const keys = Object.keys(doc.entity);
    for (let i = 0; i < keys.length; i++) {
      if (allowedEntityAttributes.indexOf(keys[i]) < 0) {
        notAllowedAttributes.push(keys[i]);
      }
    }

    if (notAllowedAttributes.length > 0) {
      throw new BadCRUDRequestError(
        `The following attributes are not allowed to be ` +
          `updated without forcing it (?force=true): ${notAllowedAttributes.join(', ')}`
      );
    }
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
