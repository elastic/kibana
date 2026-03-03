/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import { ENTITY_ID_FIELD } from '../../../common/domain/definitions/common_fields';
import { getLatestEntitiesIndexName } from '../assets/latest_index';
import {
  ChainResolutionError,
  EntitiesNotFoundError,
  EntityHasAliasesError,
  MixedEntityTypesError,
  ResolutionSearchTruncatedError,
  ResolutionUpdateError,
  SelfLinkError,
} from '../errors';

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
    const index = getLatestEntitiesIndexName(this.namespace);

    // 1. Deduplicate entity_ids
    const entityIds = [...new Set(rawEntityIds)];

    // 2. Validate: target cannot appear in entity_ids
    if (entityIds.includes(targetId)) {
      throw new SelfLinkError(targetId);
    }

    // 3. Fetch and validate all involved entities exist
    const allIds = [targetId, ...entityIds];
    const entities = await this.fetchAndValidateEntities(allIds);

    // 4. Validate: all same type
    this.validateSameEntityType(entities);

    // 5. Validate: target has no resolved_to (is not an alias)
    const targetEntity = entities.get(targetId)!;
    const targetResolvedTo = targetEntity[RESOLVED_TO_FIELD] as string | undefined;
    if (targetResolvedTo) {
      throw new ChainResolutionError(targetId, targetResolvedTo);
    }

    // 6. Check which entities among entity_ids have aliases pointing to them
    const entitiesWithAliases = await this.findEntitiesWithAliases(entityIds);

    // 7. Categorize each entity_id
    const linked: string[] = [];
    const skipped: string[] = [];

    for (const entityId of entityIds) {
      const entity = entities.get(entityId)!;
      const resolvedTo = entity[RESOLVED_TO_FIELD] as string | undefined;

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

    // 8. Batch updateByQuery: set resolved_to on all entities to link
    this.logger.debug(`Linking ${linked.length} entities to target '${targetId}'`);

    const linkResult = await this.esClient.updateByQuery({
      index,
      query: {
        bool: {
          filter: [{ terms: { [ENTITY_ID_FIELD]: linked } }],
        },
      },
      script: {
        source: `ctx._source['${RESOLVED_TO_FIELD}'] = params.targetId`,
        lang: 'painless',
        params: { targetId },
      },
      refresh: true,
    });

    if (linkResult.failures?.length) {
      this.logger.error(
        `updateByQuery failures while linking entities to '${targetId}': ${JSON.stringify(
          linkResult.failures
        )}`
      );
      throw new ResolutionUpdateError('link entities', linkResult.failures);
    }

    return { linked, skipped, target_id: targetId };
  }

  /**
   * Unlinks alias entities by removing their resolved_to field.
   * Unlinked entities become standalone.
   */
  public async unlinkEntities(rawEntityIds: string[]): Promise<UnlinkResult> {
    const index = getLatestEntitiesIndexName(this.namespace);

    // 1. Deduplicate and fetch all entities
    const entityIds = [...new Set(rawEntityIds)];
    const entities = await this.fetchAndValidateEntities(entityIds);

    // 2. Categorize: aliases to unlink vs non-aliases to skip
    const toUnlink: string[] = [];
    const skipped: string[] = [];

    for (const entityId of entityIds) {
      const entity = entities.get(entityId)!;
      const resolvedTo = entity[RESOLVED_TO_FIELD] as string | undefined;
      if (resolvedTo) {
        toUnlink.push(entityId);
      } else {
        skipped.push(entityId);
      }
    }

    if (toUnlink.length === 0) {
      return { unlinked: [], skipped };
    }

    // 3. Batch updateByQuery: remove resolved_to field
    this.logger.debug(`Unlinking ${toUnlink.length} entities`);

    const unlinkResult = await this.esClient.updateByQuery({
      index,
      query: {
        bool: {
          filter: [{ terms: { [ENTITY_ID_FIELD]: toUnlink } }],
        },
      },
      script: {
        source: `ctx._source.remove('${RESOLVED_TO_FIELD}')`,
        lang: 'painless',
      },
      refresh: true,
    });

    if (unlinkResult.failures?.length) {
      this.logger.error(
        `updateByQuery failures while unlinking entities: ${JSON.stringify(unlinkResult.failures)}`
      );
      throw new ResolutionUpdateError('unlink entities', unlinkResult.failures);
    }

    return { unlinked: toUnlink, skipped };
  }

  /**
   * Returns the resolution group for any entity (target or alias).
   * Standalone entities return as the target with empty aliases.
   */
  public async getResolutionGroup(entityId: string): Promise<ResolutionGroup> {
    const index = getLatestEntitiesIndexName(this.namespace);

    // 1. Fetch the requested entity
    const entities = await this.fetchAndValidateEntities([entityId]);
    const inputEntity = entities.get(entityId)!;

    // 2. Determine the target ID
    const resolvedTo = inputEntity[RESOLVED_TO_FIELD] as string | undefined;
    const targetId = resolvedTo ?? entityId;

    // 3. Query for target + all aliases in one search
    const response = await this.esClient.search<Record<string, unknown>>({
      index,
      size: MAX_RESOLUTION_SEARCH_SIZE,
      query: {
        bool: {
          should: [
            { term: { [ENTITY_ID_FIELD]: targetId } },
            { term: { [RESOLVED_TO_FIELD]: targetId } },
          ],
          minimum_should_match: 1,
        },
      },
      _source: true,
    });

    this.throwIfTruncated(response, `getResolutionGroup for target '${targetId}'`);

    // 4. Separate target from aliases
    let target: Record<string, unknown> | undefined;
    const aliases: Array<Record<string, unknown>> = [];

    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      const hitEntityId = source[ENTITY_ID_FIELD] as string;

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
    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;
    const returned = response.hits.hits.length;
    if (total > returned) {
      throw new ResolutionSearchTruncatedError(context, returned, total);
    }
  }

  /**
   * Fetches entities by their entity.id values and validates that all exist.
   * Throws EntitiesNotFoundError if any IDs are missing.
   */
  private async fetchAndValidateEntities(
    entityIds: string[]
  ): Promise<Map<string, Record<string, unknown>>> {
    const index = getLatestEntitiesIndexName(this.namespace);
    const response = await this.esClient.search<Record<string, unknown>>({
      index,
      size: entityIds.length,
      query: {
        bool: {
          filter: [{ terms: { [ENTITY_ID_FIELD]: entityIds } }],
        },
      },
      _source: true,
    });

    const entities = new Map<string, Record<string, unknown>>();
    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      const id = source[ENTITY_ID_FIELD] as string;
      entities.set(id, source);
    }

    const missingIds = entityIds.filter((id) => !entities.has(id));
    if (missingIds.length > 0) {
      throw new EntitiesNotFoundError(missingIds);
    }

    return entities;
  }

  /**
   * For a list of entity IDs, finds which ones have aliases pointing to them.
   * Returns a map from entity ID → list of alias entity IDs.
   */
  private async findEntitiesWithAliases(entityIds: string[]): Promise<Map<string, string[]>> {
    const index = getLatestEntitiesIndexName(this.namespace);
    const response = await this.esClient.search<Record<string, unknown>>({
      index,
      size: MAX_RESOLUTION_SEARCH_SIZE,
      query: {
        bool: {
          filter: [{ terms: { [RESOLVED_TO_FIELD]: entityIds } }],
        },
      },
      _source: [ENTITY_ID_FIELD, RESOLVED_TO_FIELD],
    });

    this.throwIfTruncated(response, 'findEntitiesWithAliases');

    const result = new Map<string, string[]>();
    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      const resolvedTo = source[RESOLVED_TO_FIELD] as string;
      const aliasId = source[ENTITY_ID_FIELD] as string;

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
      const type = entity[ENGINE_METADATA_TYPE_FIELD] as string | undefined;
      if (type) {
        types.add(type);
      }
    }

    if (types.size > 1) {
      throw new MixedEntityTypesError([...types]);
    }
  }
}
