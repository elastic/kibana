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
import { hashEuid, getEuidFromObject } from '../../../common/domain/euid';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
import {
  BadCRUDRequestError,
  EntityNotFoundError,
  EntityAlreadyExistsError,
  EntityStoreNotInstalledError,
} from '../errors';
import { buildEntityListSourceFilter } from '../../../common/domain/definitions/entity_list_source';
import { getEntityCreationCandidate } from '../../../common/domain/definitions/creatable_from_document';
import type { EntityCreationRejectionReason } from '../../../common/domain/definitions/creatable_from_document';
import type { EntityCreatedBy } from '../../../common/domain/definitions/common_fields';
import { validateAndTransformDoc } from './utils';
import { buildEntityFromSource } from './entity_from_source';
import { runWithSpan } from '../../telemetry/traces';
import {
  searchEntitiesV2,
  type SearchEntitiesV2Inspect,
  type SearchEntitiesV2Params,
  type SearchEntitiesV2Result,
} from '../search_entities/search_entities';
import { type WorkflowEmitTarget, WorkflowEventPublisher } from './workflow_event_publisher';

const RETRY_ON_CONFLICT = 3;

interface CRUDClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
  emitWorkflowTriggerEvent?: (triggerId: string, payload: Record<string, unknown>) => Promise<void>;
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

export interface CreateEntityFromSourceRequest {
  type: EntityType;
  /** Representative source document (e.g. an alert `_source`) used to derive identity + policy gates. */
  source: unknown;
  /** Provenance stamp written to `entity.created_by`. */
  createdBy: EntityCreatedBy;
  /** Additional dot-path fields to merge onto the created doc (e.g. `entity.risk.calculated_score`). */
  fields?: Record<string, unknown>;
}

/**
 * `EntityCreationRejectionReason` values are policy rejections that never reach Elasticsearch.
 * `bulk_create_failed` covers requests that passed the policy but failed in the bulk create
 * itself for a reason other than a 409 conflict (e.g. a mapping or validation error) — see
 * `createEntitiesFromSource`.
 */
export type CreateEntityFromSourceRejectionReason =
  | EntityCreationRejectionReason
  | 'bulk_create_failed';

export interface CreateEntitiesFromSourceResult {
  /** EUIDs successfully created. */
  created: string[];
  /** EUIDs that already existed by the time the bulk create ran (race with another creator). */
  alreadyExists: string[];
  /** Requests that never reached Elasticsearch because the creation policy rejected them, or that failed in the bulk create itself. */
  rejected: Array<{ reason: CreateEntityFromSourceRejectionReason }>;
}

// EntityUpdateClient is the maintainer-safe CRUD surface: all CRUD methods
// except create/delete. createEntitiesFromSource is intentionally included — it is a scoped,
// policy-gated create path (see creatable_from_document.ts), not the unrestricted createEntity.
export type EntityUpdateClient = Omit<CRUDClient, 'createEntity' | 'deleteEntity'>;

export class CRUDClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;
  private readonly eventPublisher: WorkflowEventPublisher;

  constructor(deps: CRUDClientDependencies) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.namespace = deps.namespace;
    this.eventPublisher = new WorkflowEventPublisher({
      emit: deps.emitWorkflowTriggerEvent,
      fetchDocsFn: (ids, fields) => this.getEntities(ids, fields),
      logger: deps.logger,
      namespace: deps.namespace,
    });
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

    const baseCreateEntitiesFromSource = this.createEntitiesFromSource.bind(this);
    const tracedCreateEntitiesFromSource = (
      requests: CreateEntityFromSourceRequest[]
    ): Promise<CreateEntitiesFromSourceResult> =>
      runWithSpan({
        name: 'entityStore.crud.create_entities_from_source',
        namespace,
        attributes: {
          'entity_store.crud.operation': 'create_entities_from_source',
          'entity_store.requests.count': requests.length,
        },
        cb: () => baseCreateEntitiesFromSource(requests),
      });

    Object.defineProperty(this, 'createEntitiesFromSource', {
      value: tracedCreateEntitiesFromSource,
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
  }

  private async assertInstalled(): Promise<void> {
    const indexName = getLatestEntitiesIndexName(this.namespace);
    const exists = await this.esClient.indices.exists({ index: indexName });
    if (!exists) {
      throw new EntityStoreNotInstalledError();
    }
  }

  private async getEntities(
    ids: string[],
    sourceFields?: readonly string[]
  ): Promise<Map<string, Entity>> {
    if (ids.length === 0) return new Map();
    try {
      const { docs } = await this.esClient.mget<Entity>({
        index: getLatestEntitiesIndexName(this.namespace),
        ids: ids.map(hashEuid),
        ...(sourceFields ? { _source: [...sourceFields] } : {}),
      });
      return docs.reduce((acc, doc, i) => {
        if ('found' in doc && doc.found && doc._source) {
          acc.set(ids[i], doc._source);
        }
        return acc;
      }, new Map<string, Entity>());
    } catch (error) {
      this.logger.warn(`Failed to bulk get ${ids.length} entities: ${error}`);
      return new Map();
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

    const previousDocs = await this.eventPublisher.maybeGetExistingDocs([valid.doc]);

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

    this.eventPublisher.emitEvents([{ entityId: valid.id, entityType, doc }], previousDocs);

    return;
  }

  public async bulkUpdateEntity({
    objects,
    force = false,
  }: BulkUpdateEntityParams): Promise<BulkObjectResponse[]> {
    await this.assertInstalled();

    const operations: (BulkOperationContainer | BulkUpdateAction)[] = [];
    const emitTargets: Array<WorkflowEmitTarget & { hashedId: string }> = [];

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
      const hashedId = hashEuid(valid.id);
      operations.push(
        { update: { _id: hashedId, retry_on_conflict: RETRY_ON_CONFLICT } },
        { doc: valid.doc }
      );
      emitTargets.push({ entityId: valid.id, hashedId, entityType, doc: valid.doc });
    }

    const previousDocs = await this.eventPublisher.maybeGetExistingDocs(
      emitTargets.map(({ doc }) => doc)
    );

    this.logger.debug(`Bulk updating ${objects.length} entities`);
    const resp = await this.esClient.bulk({
      index: getLatestEntitiesIndexName(this.namespace),
      operations,
      refresh: 'wait_for',
    });

    const errors: BulkObjectResponse[] = resp.errors
      ? resp.items
          .map((item) => Object.entries(item)[0][1])
          .filter((value) => value.error !== undefined || value.status >= 400)
          .map(
            (value) =>
              ({
                _id: value._id,
                status: value.status,
                type: value.error?.type,
                reason: value.error?.reason,
              } as BulkObjectResponse)
          )
      : [];

    if (!resp.errors) {
      this.logger.debug(`Successfully bulk updated ${objects.length} entities`);
    } else {
      this.logger.debug(`Bulk updated ${objects.length} entities with errors`);
    }

    if (emitTargets.length > 0) {
      const failedIds = new Set(errors.map((e) => e._id));
      this.eventPublisher.emitEvents(
        emitTargets.filter(({ hashedId }) => !failedIds.has(hashedId)),
        previousDocs
      );
    }

    return errors;
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

  /**
   * Scoped, policy-gated create path for maintainers (e.g. the risk score maintainer's
   * create-if-missing step). Unlike {@link createEntity}, callers never supply a document
   * directly: each request's `source` (a representative alert `_source`) is run through
   * {@link getEntityCreationCandidate} first, so only EUID-valid, policy-accepted identifiers
   * (e.g. medium-confidence local users, hosts with `host.id`) are ever written.
   *
   * Issues one `create`-only bulk request so a document that already exists (e.g. created
   * concurrently by logs extraction) surfaces as a per-item 409 in `alreadyExists`, rather than
   * silently overwriting it — callers should fall back to the update path for those ids.
   *
   * Does not wait for a refresh: nothing in the same maintainer run reads these documents back
   * from the latest index, so the extra ES-side cost of `wait_for` isn't warranted here. Failures
   * are still logged and reported back to the caller (see `bulk_create_failed` below).
   */
  public async createEntitiesFromSource(
    requests: CreateEntityFromSourceRequest[]
  ): Promise<CreateEntitiesFromSourceResult> {
    await this.assertInstalled();

    const result: CreateEntitiesFromSourceResult = { created: [], alreadyExists: [], rejected: [] };
    const operations: Array<BulkOperationContainer | Entity> = [];
    const euids: string[] = [];

    for (const request of requests) {
      const candidate = getEntityCreationCandidate(request.type, request.source);
      if (!candidate.accepted) {
        result.rejected.push({ reason: candidate.reason });
        continue;
      }

      const doc = buildEntityFromSource({
        entityType: request.type,
        candidate,
        source: request.source,
        createdBy: request.createdBy,
        fields: request.fields,
      });

      const valid = validateAndTransformDoc(
        'create',
        request.type,
        this.namespace,
        doc,
        candidate.euid,
        true
      );

      operations.push({ create: { _id: hashEuid(valid.id) } }, valid.doc as Entity);
      euids.push(valid.id);
    }

    if (operations.length === 0) {
      return result;
    }

    this.logger.debug(`createEntitiesFromSource: attempting to create ${euids.length} entities`);
    const resp = await this.esClient.bulk({
      index: getLatestEntitiesIndexName(this.namespace),
      operations,
      refresh: false,
    });

    if (!resp.errors) {
      result.created.push(...euids);
      return result;
    }

    resp.items.forEach((item, i) => {
      const outcome = Object.values(item)[0] as { status: number; error?: { type?: string } };
      const euid = euids[i];
      if (outcome.status === 409 || outcome.error?.type === 'version_conflict_engine_exception') {
        result.alreadyExists.push(euid);
      } else if (outcome.error) {
        this.logger.warn(
          `createEntitiesFromSource: failed to create entity ${euid}: ${outcome.error.type}`
        );
        result.rejected.push({ reason: 'bulk_create_failed' });
      } else {
        result.created.push(euid);
      }
    });

    return result;
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
      allow_no_indices: true,
      ignore_unavailable: true,
      index: getLatestEntitiesIndexName(this.namespace),
      query,
      size,
      sort: [{ '@timestamp': 'desc' }, { _shard_doc: 'desc' }],
      search_after: searchAfter,
      ...(fields && fields.length > 0 ? { fields } : {}),
      ...buildEntityListSourceFilter({
        sourceIncludes: source,
      }),
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
}
