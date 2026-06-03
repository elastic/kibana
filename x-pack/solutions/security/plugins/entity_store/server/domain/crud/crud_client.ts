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
  QueryDslFieldAndFormat,
  QueryDslQueryContainer,
  Result,
  SearchHit,
  SortOrder,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Entity } from '../../../common/domain/definitions/entity.gen';
import type { EntityType } from '../../../common';
import {
  RELATIONSHIP_KINDS,
  type RelationshipKind,
  type RelationshipMetadataDoc,
} from '../../../common/domain/entity_metadata/relationship_metadata';
import { hashEuid, getEuidFromObject } from '../../../common/domain/euid';
import {
  ENTITY_METADATA,
  getEntitiesAlias,
  getLatestEntitiesIndexName,
} from '../../../common/domain/entity_index';
import { getMetadataEntitiesDataStreamName } from '../asset_manager/metadata_data_stream';
import {
  BadCRUDRequestError,
  EntityNotFoundError,
  EntityAlreadyExistsError,
  EntityStoreNotInstalledError,
} from '../errors';
import { validateAndTransformDoc } from './utils';
import { runWithSpan } from '../../telemetry/traces';
import {
  searchEntitiesV2,
  type SearchEntitiesV2Inspect,
  type SearchEntitiesV2Params,
  type SearchEntitiesV2Result,
} from '../search_entities/search_entities';

const RETRY_ON_CONFLICT = 3;

interface CRUDClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

export interface ListEntitiesParams {
  filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
  size?: number;
  source?: string[] | undefined;
  searchAfter?: Array<string | number>;
  fields?: (QueryDslFieldAndFormat | string)[];
  /** Page/search mode (unified latest index); mutually exclusive with KQL `filter` / cursor params on the route. */
  entityTypes?: EntityType[];
  filterQuery?: string;
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: SortOrder;
}

export interface ListEntitiesResult {
  entities: Entity[];
  fields?: Array<SearchHit['fields']>; // Only present if `fields` was specified in ListEntitiesParams
  nextSearchAfter?: Array<string | number>;
  total?: number;
  page?: number;
  per_page?: number;
  inspect?: SearchEntitiesV2Inspect;
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

const RELATIONSHIP_METADATA_SORT_FIELDS = ['@timestamp', 'event.ingested'] as const;

export interface ListRelationshipMetadataParams {
  entityId: string;
  kind?: RelationshipKind;
  target?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
  sort_field?: string;
  sort_order?: SortOrder;
}

export interface ListRelationshipMetadataResult {
  records: RelationshipMetadataDoc[];
  total: number;
  page: number;
  per_page: number;
}

// EntityUpdateClient is the maintainer-safe CRUD surface: all CRUD methods
// except create/delete.
export type EntityUpdateClient = Omit<CRUDClient, 'createEntity' | 'deleteEntity'>;

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

    const baseBulkAppendRelationshipMetadata =
      this.bulkAppendRelationshipMetadata.bind(this);
    const tracedBulkAppendRelationshipMetadata = (
      docs: RelationshipMetadataDoc[]
    ): Promise<BulkObjectResponse[]> =>
      runWithSpan({
        name: 'entityStore.crud.bulk_append_relationship_metadatas',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'bulk_append_relationship_metadatas',
          'entity_store.objects.count': docs.length,
        },
        cb: () => baseBulkAppendRelationshipMetadata(docs),
      });

    Object.defineProperty(this, 'bulkAppendRelationshipMetadata', {
      value: tracedBulkAppendRelationshipMetadata,
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

    const baseSearchLatestEntities = this.searchLatestEntities.bind(this);
    const tracedSearchLatestEntities = (
      params: SearchEntitiesV2Params
    ): Promise<SearchEntitiesV2Result> =>
      runWithSpan({
        name: 'entityStore.crud.search_latest_entities',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'search_latest_entities',
        },
        cb: () => baseSearchLatestEntities(params),
      });

    Object.defineProperty(this, 'searchLatestEntities', {
      value: tracedSearchLatestEntities,
      configurable: true,
      writable: true,
    });

    const baseListRelationshipMetadata = this.listRelationshipMetadata.bind(this);
    const tracedListRelationshipMetadata = (
      params: ListRelationshipMetadataParams
    ): Promise<ListRelationshipMetadataResult> =>
      runWithSpan({
        name: 'entityStore.crud.list_relationship_metadata',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'list_relationship_metadata',
        },
        cb: () => baseListRelationshipMetadata(params),
      });

    Object.defineProperty(this, 'listRelationshipMetadata', {
      value: tracedListRelationshipMetadata,
      configurable: true,
      writable: true,
    });
  }

  private async assertInstalled(): Promise<void> {
    const indexName = getLatestEntitiesIndexName(this.namespace);
    const exists = await this.esClient.indices.exists({ index: indexName });
    if (!exists) {
      throw new EntityStoreNotInstalledError();
    }
  }

  /**
   * Page/search over the v2 unified LATEST entities index (normalized hits, optional JSON `filterQuery`, entity-type filter).
   * Prefer {@link listEntities} from HTTP routes; this remains for direct server callers.
   */
  public async searchLatestEntities(
    params: SearchEntitiesV2Params
  ): Promise<SearchEntitiesV2Result> {
    return searchEntitiesV2({
      esClient: this.esClient,
      namespace: this.namespace,
      ...params,
    });
  }

  // updateEntity takes a single entity patch and applies it to an existing
  // entity in LATEST index. The patch has to contain either:
  // 1. ID only - a valid ID and non-identifying data - provided ID will be used
  // 2. ID and Identity - a valid ID and matching identifying data - provided
  // ID will be validated and used if correct
  // 3. Identity only - no ID and identifying data - ID will be generated
  public async updateEntity(entityType: EntityType, doc: Entity, force: boolean): Promise<void> {
    await this.assertInstalled();
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
    await this.assertInstalled();
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

  // Appends RelationshipMetadataDoc records to the metadata datastream.
  // Datastream is append-only, so the bulk op is `create` rather than `update`.
  // Mirrors `bulkUpdateEntity`'s contract: does not throw on partial bulk
  // failure — returns one BulkObjectResponse per failed item. Transport-level
  // exceptions from esClient.bulk propagate to the maintainer's task boundary.
  public async bulkAppendRelationshipMetadata(
    docs: RelationshipMetadataDoc[]
  ): Promise<BulkObjectResponse[]> {
    if (docs.length === 0) return [];
    const operations: Array<BulkOperationContainer | RelationshipMetadataDoc> = [];
    for (const doc of docs) {
      operations.push({ create: {} }, doc);
    }
    const resp = await this.esClient.bulk({
      index: getMetadataEntitiesDataStreamName(this.namespace),
      operations,
      refresh: 'wait_for',
    });

    if (!resp.errors) {
      this.logger.debug(`Successfully appended ${docs.length} relationship observations`);
      return [];
    }
    this.logger.debug(`Appended ${docs.length} relationship observations with errors`);
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
    await this.assertInstalled();
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

  // listEntities searches the LATEST index: cursor mode (KQL-derived DSL + search_after) or
  // page mode (same semantics as searchEntitiesV2: sort, from/size, entity types, JSON filterQuery).
  public async listEntities(params?: ListEntitiesParams): Promise<ListEntitiesResult> {
    const p = params ?? {};
    const pageMode =
      p.page != null ||
      p.perPage != null ||
      p.sortField != null ||
      p.sortOrder != null ||
      p.filterQuery != null ||
      (p.entityTypes != null && p.entityTypes.length > 0);

    if (pageMode) {
      this.logger.debug('Listing entities (page mode)');
      const { records, total, inspect } = await searchEntitiesV2({
        esClient: this.esClient,
        namespace: this.namespace,
        entityTypes: p.entityTypes ?? [],
        filterQuery: p.filterQuery,
        page: p.page ?? 1,
        perPage: p.perPage ?? 10,
        sortField: p.sortField ?? '@timestamp',
        sortOrder: p.sortOrder ?? 'desc',
      });
      return {
        entities: records,
        total,
        page: p.page ?? 1,
        per_page: p.perPage ?? 10,
        inspect,
      };
    }

    this.logger.debug('Listing entities (cursor mode)');

    const { filter, size, searchAfter, source, fields } = p;

    let query: QueryDslQueryContainer = { match_all: {} };
    if (filter) {
      if (Array.isArray(filter)) {
        query = { bool: { filter } };
      } else {
        query = { bool: { filter: [filter] } };
      }
    }

    const resp = await this.esClient.search<Entity>({
      index: getLatestEntitiesIndexName(this.namespace),
      query,
      size,
      sort: [{ '@timestamp': 'desc' }, { _shard_doc: 'desc' }],
      search_after: searchAfter,
      ...(fields && fields.length > 0 ? { fields } : {}),
      ...(source && source.length > 0 ? { _source: source } : {}),
    });

    const hits = resp.hits.hits;
    const entities = hits.map((hit) => hit._source as Entity);
    const lastHit = hits[hits.length - 1];
    const entityFields = fields && fields.length > 0 ? hits.map((hit) => hit.fields) : undefined;

    return {
      entities,
      nextSearchAfter: lastHit?.sort as Array<string | number> | undefined,
      ...(entityFields ? { fields: entityFields } : {}),
    };
  }

  // Reads relationship observations from the metadata datastream alias. The
  // method owns query construction — routes forward parsed params untouched.
  public async listRelationshipMetadata(
    params: ListRelationshipMetadataParams
  ): Promise<ListRelationshipMetadataResult> {
    const page = params.page ?? 1;
    const perPage = params.per_page ?? 10;
    const sortField: string = params.sort_field ?? '@timestamp';
    const sortOrder: SortOrder = params.sort_order ?? 'desc';

    if (!(RELATIONSHIP_METADATA_SORT_FIELDS as readonly string[]).includes(sortField)) {
      throw new BadCRUDRequestError(
        `Invalid sort_field "${sortField}": must be one of ${RELATIONSHIP_METADATA_SORT_FIELDS.join(
          ', '
        )}`
      );
    }

    const filter: QueryDslQueryContainer[] = [
      { term: { 'event.action': 'relationship_observed' } },
      { term: { 'entity.id': params.entityId } },
    ];

    if (params.from !== undefined || params.to !== undefined) {
      const range: { gte?: string; lte?: string } = {};
      if (params.from !== undefined) range.gte = params.from;
      if (params.to !== undefined) range.lte = params.to;
      filter.push({ range: { '@timestamp': range } });
    }

    if (params.kind !== undefined && params.target !== undefined) {
      filter.push({
        term: { [`entity.relationships.${params.kind}.target`]: params.target },
      });
    } else if (params.kind !== undefined) {
      filter.push({ exists: { field: `entity.relationships.${params.kind}` } });
    } else if (params.target !== undefined) {
      const target = params.target;
      filter.push({
        bool: {
          should: RELATIONSHIP_KINDS.map((kind) => ({
            term: { [`entity.relationships.${kind}.target`]: target },
          })),
          minimum_should_match: 1,
        },
      });
    }

    const resp = await this.esClient.search<RelationshipMetadataDoc>({
      index: getEntitiesAlias(ENTITY_METADATA, this.namespace),
      query: { bool: { filter } },
      from: (page - 1) * perPage,
      size: perPage,
      sort: [{ [sortField]: sortOrder }, { _shard_doc: 'desc' }],
    });

    const records = resp.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is RelationshipMetadataDoc => src !== undefined);
    const total =
      typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total?.value ?? 0;

    return { records, total, page, per_page: perPage };
  }
}
