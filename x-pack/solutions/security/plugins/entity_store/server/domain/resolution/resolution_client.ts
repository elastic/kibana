/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkResponse, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import { ENTITY_ID_FIELD } from '../../../common/domain/definitions/common_fields';
import { getFieldValue } from '../../../common/domain/euid/commons';
import { getEntitiesAlias, ENTITY_LATEST } from '../../../common/domain/entity_index';
import {
  ChainResolutionError,
  EntitiesNotFoundError,
  EntityHasAliasesError,
  MixedEntityTypesError,
  ResolutionSearchTruncatedError,
  ResolutionUpdateError,
  SelfLinkError,
} from '../errors';
import {
  searchEntitiesByIds,
  searchByResolvedToField,
  searchResolutionGroup,
  bulkUpdateEntityDocs,
} from '../../infra/elasticsearch/resolution';

const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';
const MAX_RESOLUTION_SEARCH_SIZE = 10_000;

interface ResolutionClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

export interface LinkResult {
  linked: string[];
  skipped: string[];
  target_id: string;
}

export interface UnlinkResult {
  unlinked: string[];
  skipped: string[];
}

export interface ResolutionGroup {
  target: Record<string, unknown>;
  aliases: Array<Record<string, unknown>>;
  group_size: number;
}

interface FetchedEntities {
  sources: Map<string, Record<string, unknown>>;
  docIds: Map<string, string>;
}

export class ResolutionClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;

  constructor({ logger, esClient, namespace }: ResolutionClientOpts) {
    this.logger = logger;
    this.esClient = esClient;
    this.namespace = namespace;
  }

  /**
   * Links one or more entities to a target entity by setting resolved_to.
   * Validates chain prevention (can't link an alias) and has-aliases prevention
   * (can't link an entity that has aliases pointing to it).
   */
  public async linkEntities(targetId: string, rawEntityIds: string[]): Promise<LinkResult> {
    const index = getEntitiesAlias(ENTITY_LATEST, this.namespace);

    // 1. Deduplicate entity_ids
    const entityIds = [...new Set(rawEntityIds)];

    // 2. Validate: target cannot appear in entity_ids
    if (entityIds.includes(targetId)) {
      throw new SelfLinkError(targetId);
    }

    // 3. Fetch and validate all involved entities exist
    const allIds = [targetId, ...entityIds];
    const { sources, docIds } = await this.fetchAndValidateEntities(allIds);

    // 4. Validate: all same type
    this.validateSameEntityType(sources);

    // 5. Validate: target has no resolved_to (is not an alias)
    const targetEntity = sources.get(targetId)!;
    const targetResolvedTo = getFieldValue(targetEntity, RESOLVED_TO_FIELD);
    if (targetResolvedTo) {
      throw new ChainResolutionError(targetId, targetResolvedTo);
    }

    // 6. Check which entities among entity_ids have aliases pointing to them
    const entitiesWithAliases = await this.findEntitiesWithAliases(entityIds);

    // 7. Categorize each entity_id
    const linked: string[] = [];
    const skipped: string[] = [];

    for (const entityId of entityIds) {
      const entity = sources.get(entityId)!;
      const resolvedTo = getFieldValue(entity, RESOLVED_TO_FIELD);

      if (resolvedTo === targetId) {
        skipped.push(entityId);
      } else if (resolvedTo) {
        throw new ChainResolutionError(entityId, resolvedTo);
      } else if (entitiesWithAliases.has(entityId)) {
        throw new EntityHasAliasesError(entityId, entitiesWithAliases.get(entityId)!);
      } else {
        linked.push(entityId);
      }
    }

    if (linked.length === 0) {
      return { linked: [], skipped, target_id: targetId };
    }

    // 8. Bulk update: set resolved_to on all entities to link
    this.logger.debug(`Linking ${linked.length} entities to target '${targetId}'`);

    const updates = linked.map((entityId) => ({
      docId: docIds.get(entityId)!,
      doc: { [RESOLVED_TO_FIELD]: targetId },
    }));
    const linkResult = await bulkUpdateEntityDocs(this.esClient, { index, updates });

    this.throwOnBulkErrors(linkResult, `linking entities to '${targetId}'`);

    return { linked, skipped, target_id: targetId };
  }

  /**
   * Unlinks alias entities by removing their resolved_to field.
   * Unlinked entities become standalone.
   */
  public async unlinkEntities(rawEntityIds: string[]): Promise<UnlinkResult> {
    const index = getEntitiesAlias(ENTITY_LATEST, this.namespace);

    // 1. Deduplicate and fetch all entities
    const entityIds = [...new Set(rawEntityIds)];
    const { sources, docIds } = await this.fetchAndValidateEntities(entityIds);

    // 2. Categorize: aliases to unlink vs non-aliases to skip
    const toUnlink: string[] = [];
    const skipped: string[] = [];

    for (const entityId of entityIds) {
      const entity = sources.get(entityId)!;
      const resolvedTo = getFieldValue(entity, RESOLVED_TO_FIELD);
      if (resolvedTo) {
        toUnlink.push(entityId);
      } else {
        skipped.push(entityId);
      }
    }

    if (toUnlink.length === 0) {
      return { unlinked: [], skipped };
    }

    // 3. Bulk update: set resolved_to to null (effectively removes the link)
    this.logger.debug(`Unlinking ${toUnlink.length} entities`);

    const updates = toUnlink.map((entityId) => ({
      docId: docIds.get(entityId)!,
      doc: { [RESOLVED_TO_FIELD]: null },
    }));
    const unlinkResult = await bulkUpdateEntityDocs(this.esClient, { index, updates });

    this.throwOnBulkErrors(unlinkResult, 'unlinking entities');

    return { unlinked: toUnlink, skipped };
  }

  /**
   * Returns the resolution group for any entity (target or alias).
   * Standalone entities return as the target with empty aliases.
   */
  public async getResolutionGroup(entityId: string): Promise<ResolutionGroup> {
    const index = getEntitiesAlias(ENTITY_LATEST, this.namespace);

    // 1. Fetch the requested entity
    const { sources } = await this.fetchAndValidateEntities([entityId]);
    const inputEntity = sources.get(entityId)!;

    // 2. Determine the target ID
    const resolvedTo = getFieldValue(inputEntity, RESOLVED_TO_FIELD);
    const targetId = resolvedTo ?? entityId;

    // 3. Query for target + all aliases in one search
    const response = await searchResolutionGroup(this.esClient, {
      index,
      entityIdField: ENTITY_ID_FIELD,
      resolvedToField: RESOLVED_TO_FIELD,
      targetId,
      maxSize: MAX_RESOLUTION_SEARCH_SIZE,
    });

    this.throwIfTruncated(response, `getResolutionGroup for target '${targetId}'`);

    // 4. Separate target from aliases
    let target: Record<string, unknown> | undefined;
    const aliases: Array<Record<string, unknown>> = [];

    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      const hitEntityId = getFieldValue(source, ENTITY_ID_FIELD);

      if (hitEntityId === targetId) {
        target = source;
      } else {
        aliases.push(source);
      }
    }

    // If no target was found in the query, and the input entity has no
    // resolveTo, it's the target entity
    if (!target) {
      if (!resolvedTo) {
        target = inputEntity;
      } else {
        throw new EntitiesNotFoundError([targetId]);
      }
    }

    return {
      target,
      aliases,
      group_size: 1 + aliases.length,
    };
  }

  /**
   * Validates that the search response was not truncated.
   * Truncation means we received fewer results than exist, which would lead to
   * incomplete resolution groups or missed alias checks — failing closed prevents
   * inconsistent link/unlink decisions.
   */
  private throwIfTruncated(response: SearchResponse, context: string): void {
    let total: number;
    let isTruncated = false;

    if (typeof response.hits.total === 'number') {
      total = response.hits.total;
    } else {
      total = response.hits.total?.value ?? 0;
      if (response.hits.total?.relation === 'gte') {
        isTruncated = true;
      }
    }

    const returned = response.hits.hits.length;
    if (isTruncated || total > returned) {
      throw new ResolutionSearchTruncatedError(context, returned, total);
    }
  }

  /**
   * Checks a bulk response for errors and throws ResolutionUpdateError if any.
   */
  private throwOnBulkErrors(result: BulkResponse, context: string): void {
    if (result.errors) {
      const failures = result.items
        .filter((item) => item.update?.error)
        .map((item) => item.update!);
      this.logger.error(`Bulk update failures while ${context}: ${JSON.stringify(failures)}`);
      throw new ResolutionUpdateError(context, failures);
    }
  }

  /**
   * Fetches entities by their entity.id values and validates that all exist.
   * Throws EntitiesNotFoundError if any IDs are missing.
   */
  private async fetchAndValidateEntities(entityIds: string[]): Promise<FetchedEntities> {
    const index = getEntitiesAlias(ENTITY_LATEST, this.namespace);
    const response = await searchEntitiesByIds(this.esClient, {
      index,
      entityIdField: ENTITY_ID_FIELD,
      entityIds,
    });

    const sources = new Map<string, Record<string, unknown>>();
    const docIds = new Map<string, string>();
    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      const id = getFieldValue(source, ENTITY_ID_FIELD);
      if (id) {
        sources.set(id, source);
        if (hit._id) {
          docIds.set(id, hit._id);
        }
      }
    }

    const missingIds = entityIds.filter((id) => !sources.has(id));
    if (missingIds.length > 0) {
      throw new EntitiesNotFoundError(missingIds);
    }

    return { sources, docIds };
  }

  /**
   * For a list of entity IDs, finds which ones have aliases pointing to them.
   * Returns a map from entity ID → list of alias entity IDs.
   */
  private async findEntitiesWithAliases(entityIds: string[]): Promise<Map<string, string[]>> {
    const index = getEntitiesAlias(ENTITY_LATEST, this.namespace);
    const response = await searchByResolvedToField(this.esClient, {
      index,
      resolvedToField: RESOLVED_TO_FIELD,
      targetIds: entityIds,
      maxSize: MAX_RESOLUTION_SEARCH_SIZE,
      source: [ENTITY_ID_FIELD, RESOLVED_TO_FIELD],
    });

    this.throwIfTruncated(response, 'findEntitiesWithAliases');

    const result = new Map<string, string[]>();
    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      const resolvedTo = getFieldValue(source, RESOLVED_TO_FIELD);
      const aliasId = getFieldValue(source, ENTITY_ID_FIELD);

      if (!resolvedTo || !aliasId) {
        continue;
      }

      const existing = result.get(resolvedTo) ?? [];
      existing.push(aliasId);
      result.set(resolvedTo, existing);
    }
    return result;
  }

  /**
   * Validates that all entities in the map have the same EngineMetadata.Type.
   */
  private validateSameEntityType(entities: Map<string, Record<string, unknown>>): void {
    const types = new Set<string>();
    for (const entity of entities.values()) {
      const type = getFieldValue(entity, ENGINE_METADATA_TYPE_FIELD);
      if (type) {
        types.add(type);
      }
    }

    if (types.size > 1) {
      throw new MixedEntityTypesError([...types]);
    }
  }
}
