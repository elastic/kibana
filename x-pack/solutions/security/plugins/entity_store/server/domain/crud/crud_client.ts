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
  QueryDslQueryContainer,
  Result,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Entity } from '../../../common/domain/definitions/entity.gen';
import type { EntityType } from '../../../common';
import { getEuidFromObject } from '../../../common/domain/euid';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
import { BadCRUDRequestError, EntityNotFoundError, EntityAlreadyExistsError } from '../errors';
import { hashEuid, validateAndTransformDoc } from './utils';
import { runWithSpan } from '../../telemetry/traces';

const RETRY_ON_CONFLICT = 3;

interface CRUDClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

export interface ListEntitiesParams {
  filter?: QueryDslQueryContainer;
  size?: number;
  searchAfter?: Array<string | number>;
}

export interface ListEntitiesResult {
  entities: Entity[];
  nextSearchAfter?: Array<string | number>;
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

// EntityUpdateClient is a stripped CRUD client allowing only for updates. Used
// by Entity Maintainers.
export type EntityUpdateClient = Pick<CRUDClient, 'updateEntity' | 'bulkUpdateEntity'>;

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

    const baseListEntities = this.listEntities.bind(this);
    const tracedListEntities = (params?: ListEntitiesParams): Promise<ListEntitiesResult> =>
      runWithSpan({
        name: 'entityStore.crud.list_entities',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'list_entities',
        },
        cb: () => baseListEntities(params),
      });

    Object.defineProperty(this, 'listEntities', {
      value: tracedListEntities,
      configurable: true,
      writable: true,
    });
  }

  // updateEntity takes a single entity patch and applies it to an existing
  // entity in LATEST index. The patch has to contain either:
  // 1. ID only - a valid ID and non-identifying data - provided ID will be used
  // 2. ID and Identity - a valid ID and matching identifying data - provided
  // ID will be validated and used if correct
  // 3. Identity only - no ID and identifying data - ID will be generated
  public async updateEntity(entityType: EntityType, doc: Entity, force: boolean): Promise<void> {
    const generatedId = getEuidFromObject(entityType, doc);
    const valid = validateAndTransformDoc(
      'update',
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
      const valid = validateAndTransformDoc(
        'update',
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
    const valid = validateAndTransformDoc('create', entityType, this.namespace, doc, id, true);
    try {
      const { result } = await this.esClient.create({
        index: getLatestEntitiesIndexName(this.namespace),
        id: hashEuid(valid.id),
        document: valid.doc,
        refresh: 'wait_for',
      });
      if (result === 'created') {
        this.logger.debug(`Created entity ID ${id}`);
      }
    } catch (error) {
      if (error.statusCode === 409) {
        throw new EntityAlreadyExistsError(valid.id);
      }
      throw error;
    }
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

  // listEntities searches the LATEST index for all entities.
  // An optional DSL filter can be provided and is applied as an additional
  // filter clause on the search query, e.g. to scope results by additional
  // field conditions. Supports size and searchAfter for pagination.
  public async listEntities(params?: ListEntitiesParams): Promise<ListEntitiesResult> {
    this.logger.debug('Listing entities');

    const { filter, size, searchAfter } = params ?? {};

    const query: QueryDslQueryContainer = filter
      ? { bool: { filter: [filter] } }
      : { match_all: {} };

    const resp = await this.esClient.search<Entity>({
      index: getLatestEntitiesIndexName(this.namespace),
      query,
      size,
      sort: [{ _id: 'asc' }],
      search_after: searchAfter,
    });

    const hits = resp.hits.hits;
    const entities = hits.map((hit) => hit._source as Entity);
    const lastHit = hits[hits.length - 1];

    return { entities, nextSearchAfter: lastHit?.sort as Array<string | number> | undefined };
  }
}
