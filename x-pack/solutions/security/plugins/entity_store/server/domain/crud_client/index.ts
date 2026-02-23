/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  BulkOperationContainer,
  BulkUpdateAction,
  Result,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createHash } from 'crypto';
import type { Entity } from '../../../common/domain/definitions/entity.gen';
import type { EntityType } from '../../../common';
import { getEuidFromObject } from '../../../common/domain/euid';
import { getLatestEntitiesIndexName } from '../assets/latest_index';
import { BadCRUDRequestError, EntityNotFoundError } from '../errors';
import { getUpdatesEntitiesDataStreamName } from '../assets/updates_data_stream';
import { validateAndTransformDoc } from './utils';

interface CRUDClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

interface BulkObject {
  type: EntityType;
  doc: Entity;
}

interface BulkObjectResponse {
  _id: string;
  status: number;
  type: string;
  reason: string;
}

export class CRUDClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;

  constructor(deps: CRUDClientDependencies) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.namespace = deps.namespace;
  }

  public async upsertEntity(entityType: EntityType, doc: Entity, force: boolean): Promise<void> {
    const id = getEuidFromObject(entityType, doc);
    if (id === undefined) {
      throw new BadCRUDRequestError(`Could not derive entity EUID from document`);
    }
    // EUID generation uses MD5. It is not a security-related feature.
    // eslint-disable-next-line @kbn/eslint/no_unsafe_hash
    const hashedId: string = createHash('md5').update(id).digest('hex');
    this.logger.debug(`Upserting entity ID ${id}`);

    if (!doc.entity?.id) {
      doc.entity.id = id;
    }

    const readyDoc = validateAndTransformDoc(entityType, this.namespace, doc, force);

    const { result } = await this.esClient.update({
      index: getLatestEntitiesIndexName(this.namespace),
      id: hashedId,
      doc: readyDoc,
      doc_as_upsert: true,
      retry_on_conflict: 3,
      refresh: 'wait_for',
    });

    switch (result as Result) {
      case 'created':
        this.logger.debug(`Created entity ID ${hashedId}`);
        break;
      case 'updated':
        this.logger.debug(`Updated entity ID ${hashedId}`);
        break;
      case 'noop':
        this.logger.debug(`Updated entity ID ${hashedId} (no change)`);
        break;
    }
    return;
  }

  public async upsertEntitiesBulk(
    objects: BulkObject[],
    force: boolean
  ): Promise<BulkObjectResponse[]> {
    const operations: (BulkOperationContainer | BulkUpdateAction)[] = [];

    this.logger.debug(`Preparing ${objects.length} entities for bulk upsert`);
    for (const { type: entityType, doc } of objects) {
      const readyDoc = validateAndTransformDoc(entityType, this.namespace, doc, force);
      operations.push({ create: {} }, readyDoc);
    }

    this.logger.debug(`Bulk upserting ${objects.length} entities`);
    const resp = await this.esClient.bulk({
      index: getUpdatesEntitiesDataStreamName(this.namespace),
      operations,
      refresh: 'wait_for',
    });

    if (!resp.errors) {
      this.logger.debug(`Successfully bulk upserted ${objects.length} entities`);
      return [];
    }
    this.logger.debug(`Bulk upserted ${objects.length} entities with errors`);
    return resp.items.map((item) => {
      const [, value] = Object.entries(item)[0];
      return {
        _id: value._id,
        status: value.status,
        type: value.error?.type,
        reason: value.error?.reason,
      } as BulkObjectResponse;
    });
  }

  public async deleteEntity(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting Entity ID ${id}`);
      await this.esClient.delete({
        index: getLatestEntitiesIndexName(this.namespace),
        id,
      });
    } catch (error) {
      if (error.statusCode === 404) {
        throw new EntityNotFoundError(id);
      }
      throw error;
    }
  }
}
