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
import type { Entity } from '../../../common/domain/definitions/entity.gen';
import type { EntityType } from '../../../common';
import { getEuidFromObject } from '../../../common/domain/euid';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
import { BadCRUDRequestError, EntityNotFoundError } from '../errors';
import { getUpdatesEntitiesDataStreamName } from '../asset_manager/updates_data_stream';
import {
  hashEuid,
  validateAndTransformDocForUpsert,
  validateUpdateDocIdentification,
} from './utils';
import { runWithSpan } from '../../telemetry/traces';

const RETRY_ON_CONFLICT = 3;

interface CRUDClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

export interface BulkObject {
  type: EntityType;
  doc: Entity;
}

export interface BulkObjectResponse {
  _id: string;
  status: number;
  type: string;
  reason: string;
}

interface UpsertEntitiesBulkParams {
  objects: BulkObject[];
  force?: boolean;
}

export class CRUDClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;

  constructor(deps: CRUDClientDependencies) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.namespace = deps.namespace;
    this.initWithTracing();
  }

  private initWithTracing(): void {
    const namespace = this.namespace;

    const baseUpsertEntity = this.upsertEntity.bind(this);
    const tracedUpsertEntity = (
      entityType: EntityType,
      doc: Entity,
      force: boolean
    ): Promise<void> =>
      runWithSpan({
        name: 'entityStore.crud.upsert_entity',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'upsert_entity',
          'entity_store.entity.type': entityType,
          'entity_store.force': force,
        },
        cb: () => baseUpsertEntity(entityType, doc, force),
      });

    Object.defineProperty(this, 'upsertEntity', {
      value: tracedUpsertEntity,
      configurable: true,
      writable: true,
    });

    const baseUpsertEntitiesBulk = this.upsertEntitiesBulk.bind(this);
    const tracedUpsertEntitiesBulk = (
      params: UpsertEntitiesBulkParams
    ): Promise<BulkObjectResponse[]> =>
      runWithSpan({
        name: 'entityStore.crud.upsert_entities_bulk',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'upsert_entities_bulk',
          'entity_store.objects.count': params.objects.length,
          'entity_store.force': params.force ?? false,
        },
        cb: () => baseUpsertEntitiesBulk(params),
      });

    Object.defineProperty(this, 'upsertEntitiesBulk', {
      value: tracedUpsertEntitiesBulk,
      configurable: true,
      writable: true,
    });

    const baseDeleteEntity = this.deleteEntity.bind(this);
    const tracedDeleteEntity = (id: string): Promise<void> =>
      runWithSpan({
        name: 'entityStore.crud.delete_entity',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'delete_entity',
          'entity_store.entity.id': id,
        },
        cb: () => baseDeleteEntity(id),
      });

    Object.defineProperty(this, 'deleteEntity', {
      value: tracedDeleteEntity,
      configurable: true,
      writable: true,
    });
  }

  // TODO(kuba): This is a short description of a plan to replace upsertEntity
  // and upsertEntitiesBulk with createEntity(), updateEntity(), and
  // bulkUpdateEntity().
  //
  // NOTE: all new methods should operate directly on LATEST index; ditch usage of UPDATES
  //
  // 1. Implement createEntity - ignores provided entity.id and calculates it
  // using getEuidFromObject(); throws if deriving EUID from given object is
  // impossible
  // 2. Implement updateEntity folowing logic outlined in https://github.com/elastic/kibana/issues/256698
  //   - If only id and non id relevant data is provided, update
  //   - If id and id relevant data is provided, make sure that they match, if not throw an error (or maybe overwrite the id)
  //   - If only id relevant data is provided generate the id to update
  // 3. Rename upsertEntitiesBulk to bulkUpdateEntity and update its logic to follow the logic in 2.
  // 4. Update tests and utils.ts
  // 5. Update API by removing old endpoints and adding new ones
  // 6. Update Scout tests to test new logic, make sure they pass
  // 7. Remove updates index and methods that install/test it.

  // updateEntity takes a single entity patch and applies it to an existing
  // entity in LATEST index. The patch has to contain either:
  // 1. a valid ID and non-identifying data: provided ID will be used
  // 2. a valid ID and matching identifying data: provided ID will be validated
  // and used if correct
  // 3. no ID and identifying data: ID will be generated
  public async updateEntity(entityType: EntityType, doc: Entity, force: boolean): Promise<void> {
    const id = getEuidFromObject(entityType, doc);
    validateUpdateDocIdentification(doc, id);
    const readyDoc = validateAndTransformDocForUpsert(entityType, this.namespace, doc, id, force);
    const { result } = await this.esClient.update({
      index: getLatestEntitiesIndexName(this.namespace),
      id: hashEuid(doc.entity.id),
      doc: readyDoc,
      retry_on_conflict: RETRY_ON_CONFLICT,
      refresh: 'wait_for',
    });

    switch (result as Result) {
      case 'updated':
        this.logger.debug(`Updated entity ID ${id}`);
        break;
      case 'noop':
        this.logger.debug(`Updated entity ID ${id} (no change)`);
        break;
    }
    return;
  }

  // createEntity generates EUID and creates the entity in the LATEST index
  public async createEntity(entityType: EntityType, doc: Entity): Promise<void> {
    const id = getEuidFromObject(entityType, doc);

    if (!id) {
      throw new BadCRUDRequestError(`Could not derive EUID from document`);
    }
    doc.entity.id = id;

    const readyDoc = validateAndTransformDocForUpsert(entityType, this.namespace, doc, id, true);
    const { result } = await this.esClient.create({
      index: getLatestEntitiesIndexName(this.namespace),
      id: hashEuid(doc.entity.id),
      document: readyDoc,
      refresh: 'wait_for',
    });

    if (result === 'created') {
      this.logger.debug(`Created entity ID ${id}`);
    }

    return;
  }

  /*
    // Check if document has identifying data
    const { identitySourceFields } = getEuidSourceFields(entityType);
    const flat = getFlattenedObject(doc);
    const presentIdentifyingFields = Object.keys(flat).find((k) =>
      identitySourceFields.includes(k)
    );
    const hasIdentifyingFields = presentIdentifyingFields !== undefined && presentIdentifyingFields.length > 0;
  */

  // upsertEntity takes a single entity and tries to either create or update
  // (if an entity with the same EUID already exists) it directly in the LATEST
  // index. This is considered a single synchronous upsert.
  public async upsertEntity(entityType: EntityType, doc: Entity, force: boolean): Promise<void> {
    const id = getEuidFromObject(entityType, doc);
    if (id === undefined) {
      throw new BadCRUDRequestError(`Could not derive entity EUID from document`);
    }
    this.logger.debug(`Upserting entity ID ${id}`);

    if (!doc.entity?.id) {
      doc.entity.id = id;
    }

    const readyDoc = validateAndTransformDocForUpsert(entityType, this.namespace, doc, force);

    const { result } = await this.esClient.update({
      index: getLatestEntitiesIndexName(this.namespace),
      id: hashEuid(id),
      doc: readyDoc,
      doc_as_upsert: true,
      retry_on_conflict: RETRY_ON_CONFLICT,
      refresh: 'wait_for',
    });

    switch (result as Result) {
      case 'created':
        this.logger.debug(`Created entity ID ${id}`);
        break;
      case 'updated':
        this.logger.debug(`Updated entity ID ${id}`);
        break;
      case 'noop':
        this.logger.debug(`Updated entity ID ${id} (no change)`);
        break;
    }
    return;
  }

  // upsertEntitiesBulk takes one or more entities and creates documents in
  // UPDATES index for log extraction task to pick up. This will result in
  // appropriate Entities being created or updated on next log extraction run.
  // This is considered a bulk asynchronous upsert.
  public async upsertEntitiesBulk({
    objects,
    force = false,
  }: UpsertEntitiesBulkParams): Promise<BulkObjectResponse[]> {
    const operations: (BulkOperationContainer | BulkUpdateAction)[] = [];

    this.logger.debug(`Preparing ${objects.length} entities for bulk upsert`);
    for (const { type: entityType, doc } of objects) {
      const readyDoc = validateAndTransformDocForUpsert(entityType, this.namespace, doc, force);
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
    return resp.items
      .map((item) => Object.entries(item)[0][1])
      .filter((value) => value.error !== undefined || value.status >= 400)
      .map((value) => {
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
        id: hashEuid(id),
      });
    } catch (error) {
      if (error.statusCode === 404) {
        throw new EntityNotFoundError(id);
      }
      throw error;
    }
  }
}
