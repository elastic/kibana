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

interface BulkUpdateEntityParams {
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

    const baseCreateEntity = this.createEntity.bind(this);
    const tracedCreateEntity = (entityType: EntityType, doc: Entity): Promise<void> =>
      runWithSpan({
        name: 'entityStore.crud.create_entity',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'create_entity',
          'entity_store.entity.type': entityType,
        },
        cb: () => baseCreateEntity(entityType, doc),
      });

    Object.defineProperty(this, 'createEntity', {
      value: tracedCreateEntity,
      configurable: true,
      writable: true,
    });

    const baseUpdateEntity = this.updateEntity.bind(this);
    const tracedUpdateEntity = (
      entityType: EntityType,
      doc: Entity,
      force: boolean
    ): Promise<void> =>
      runWithSpan({
        name: 'entityStore.crud.update_entity',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'update_entity',
          'entity_store.entity.type': entityType,
          'entity_store.force': force,
        },
        cb: () => baseUpdateEntity(entityType, doc, force),
      });

    Object.defineProperty(this, 'updateEntity', {
      value: tracedUpdateEntity,
      configurable: true,
      writable: true,
    });

    const baseBulkUpdateEntity = this.bulkUpdateEntity.bind(this);
    const tracedBulkUpdateEntity = (
      params: BulkUpdateEntityParams
    ): Promise<BulkObjectResponse[]> =>
      runWithSpan({
        name: 'entityStore.crud.bulk_update_entity',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'bulk_update_entity',
          'entity_store.objects.count': params.objects.length,
          'entity_store.force': params.force ?? false,
        },
        cb: () => baseBulkUpdateEntity(params),
      });

    Object.defineProperty(this, 'bulkUpdateEntity', {
      value: tracedBulkUpdateEntity,
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
  // 1. ID only - a valid ID and non-identifying data - provided ID will be used
  // 2. ID and Identity - a valid ID and matching identifying data - provided
  // ID will be validated and used if correct
  // 3. Identity only - no ID and identifying data - ID will be generated
  public async updateEntity(entityType: EntityType, doc: Entity, force: boolean): Promise<void> {
    const generatedId = getEuidFromObject(entityType, doc);
    validateUpdateDocIdentification(doc, generatedId);
    const valid = validateAndTransformDocForUpsert(
      entityType,
      this.namespace,
      doc,
      generatedId,
      force
    );
    try {
      const { result } = await this.esClient.update({
        index: getLatestEntitiesIndexName(this.namespace),
        id: hashEuid(valid.id),
        doc: valid.doc,
        retry_on_conflict: RETRY_ON_CONFLICT,
        refresh: 'wait_for',
      });

      switch (result as Result) {
        case 'updated':
          this.logger.debug(`Updated entity ID ${valid.id}`);
          break;
        case 'noop':
          this.logger.debug(`Updated entity ID ${valid.id} (no change)`);
          break;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw new EntityNotFoundError(valid.id);
      }
      throw error;
    }

    return;
  }

  public async bulkUpdateEntity({
    objects,
    force = false,
  }: BulkUpdateEntityParams): Promise<BulkObjectResponse[]> {
    const operations: (BulkOperationContainer | BulkUpdateAction)[] = [];
    this.logger.debug(`Preparing ${objects.length} entities for bulk update`);
    for (const { type: entityType, doc } of objects) {
      const generatedId = getEuidFromObject(entityType, doc);
      validateUpdateDocIdentification(doc, generatedId);
      const valid = validateAndTransformDocForUpsert(
        entityType,
        this.namespace,
        doc,
        generatedId,
        force
      );
      operations.push(
        { update: { _id: hashEuid(valid.id), retry_on_conflict: RETRY_ON_CONFLICT } },
        { doc: valid.doc }
      );
    }
    this.logger.debug(`Bulk updating ${objects.length} entities`);
    const resp = await this.esClient.bulk({
      index: getLatestEntitiesIndexName(this.namespace),
      operations,
      refresh: 'wait_for',
    });

    if (!resp.errors) {
      this.logger.debug(`Successfully bulk updated ${objects.length} entities`);
      return [];
    }
    this.logger.debug(`Bulk updated ${objects.length} entities with errors`);
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

  // createEntity generates EUID and creates the entity in the LATEST index
  public async createEntity(entityType: EntityType, doc: Entity): Promise<void> {
    const id = getEuidFromObject(entityType, doc);

    if (!id) {
      throw new BadCRUDRequestError(`Could not derive EUID from document`);
    }
    const valid = validateAndTransformDocForUpsert(entityType, this.namespace, doc, id, true);
    const { result } = await this.esClient.create({
      index: getLatestEntitiesIndexName(this.namespace),
      id: hashEuid(valid.id),
      document: valid.doc,
      refresh: 'wait_for',
    });

    if (result === 'created') {
      this.logger.debug(`Created entity ID ${id}`);
    }

    return;
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
