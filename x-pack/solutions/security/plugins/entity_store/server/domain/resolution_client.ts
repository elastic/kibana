/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import { ENTITY_ID_FIELD } from '../../common/domain/definitions/common_fields';
import { getLatestEntitiesIndexName } from './assets/latest_index';
import { MAX_SEARCH_RESPONSE_SIZE } from './constants';
import {
  ChainResolutionError,
  EntitiesNotFoundError,
  EntityHasAliasesError,
  EntityNotAliasError,
  MixedEntityTypesError,
  SelfLinkError,
} from './errors';

const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';

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

    // 3. Fetch all involved entities
    const allIds = [targetId, ...entityIds];
    const entities = await this.fetchEntitiesByIds(allIds);

    // 4. Validate: all exist
    const missingIds = allIds.filter((id) => !entities.has(id));
    if (missingIds.length > 0) {
      throw new EntitiesNotFoundError(missingIds);
    }

    // 5. Validate: all same type
    this.validateSameEntityType(entities);

    // 6. Validate: target has no resolved_to (is not an alias)
    const targetEntity = entities.get(targetId)!;
    const targetResolvedTo = targetEntity[RESOLVED_TO_FIELD] as string | undefined;
    if (targetResolvedTo) {
      throw new ChainResolutionError(targetId, targetResolvedTo);
    }

    // 7. Check which entities among entity_ids have aliases pointing to them
    const entitiesWithAliases = await this.findEntitiesWithAliases(entityIds);

    // 8. Categorize each entity_id
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

    // 9. Batch updateByQuery: set resolved_to on all entities to link
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
        `Failed to link some entities to target '${targetId}': ${JSON.stringify(
          linkResult.failures
        )}`
      );
    }

    return { linked, skipped, target_id: targetId };
  }

  /**
   * Unlinks alias entities by removing their resolved_to field.
   * Unlinked entities become standalone.
   */
  public async unlinkEntities(rawEntityIds: string[]): Promise<UnlinkResult> {
    const index = getLatestEntitiesIndexName(this.namespace);

    // 1. Deduplicate entity_ids
    const entityIds = [...new Set(rawEntityIds)];

    // 2. Fetch all entities
    const entities = await this.fetchEntitiesByIds(entityIds);

    // 3. Validate: all exist
    const missingIds = entityIds.filter((id) => !entities.has(id));
    if (missingIds.length > 0) {
      throw new EntitiesNotFoundError(missingIds);
    }

    // 4. Validate: all have resolved_to (are aliases)
    const notAliases: string[] = [];
    for (const entityId of entityIds) {
      const entity = entities.get(entityId)!;
      const resolvedTo = entity[RESOLVED_TO_FIELD] as string | undefined;
      if (!resolvedTo) {
        notAliases.push(entityId);
      }
    }

    if (notAliases.length > 0) {
      throw new EntityNotAliasError(notAliases);
    }

    // 5. Batch updateByQuery: remove resolved_to field
    this.logger.debug(`Unlinking ${entityIds.length} entities`);

    const unlinkResult = await this.esClient.updateByQuery({
      index,
      query: {
        bool: {
          filter: [{ terms: { [ENTITY_ID_FIELD]: entityIds } }],
        },
      },
      script: {
        source: `ctx._source.remove('${RESOLVED_TO_FIELD}')`,
        lang: 'painless',
      },
      refresh: true,
    });

    if (unlinkResult.failures?.length) {
      this.logger.error(`Failed to unlink some entities: ${JSON.stringify(unlinkResult.failures)}`);
    }

    return { unlinked: entityIds };
  }

  /**
   * Returns the resolution group for any entity (target or alias).
   * Standalone entities return as the target with empty aliases.
   */
  public async getResolutionGroup(entityId: string): Promise<ResolutionGroup> {
    const index = getLatestEntitiesIndexName(this.namespace);

    // 1. Fetch the requested entity
    const entities = await this.fetchEntitiesByIds([entityId]);
    const entity = entities.get(entityId);
    if (!entity) {
      throw new EntitiesNotFoundError([entityId]);
    }

    // 2. Determine the target ID
    const resolvedTo = entity[RESOLVED_TO_FIELD] as string | undefined;
    const targetId = resolvedTo ?? entityId;

    // 3. Query for target + all aliases in one search
    const response = await this.esClient.search<Record<string, unknown>>({
      index,
      size: MAX_SEARCH_RESPONSE_SIZE,
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

    this.warnIfTruncated(response, `getResolutionGroup for target '${targetId}'`);

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

    if (!target) {
      if (!resolvedTo) {
        target = entity;
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
   * Logs a warning if the search response was truncated by MAX_SEARCH_RESPONSE_SIZE.
   */
  private warnIfTruncated(response: SearchResponse, context: string): void {
    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;
    const returned = response.hits.hits.length;
    if (total > returned) {
      this.logger.warn(
        `${context}: search returned ${returned} of ${total} results (truncated at MAX_SEARCH_RESPONSE_SIZE=${MAX_SEARCH_RESPONSE_SIZE})`
      );
    }
  }

  /**
   * Fetches entities by their entity.id values from the LATEST index.
   */
  private async fetchEntitiesByIds(
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

    const result = new Map<string, Record<string, unknown>>();
    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      const entityId = source[ENTITY_ID_FIELD] as string;
      result.set(entityId, source);
    }
    return result;
  }

  /**
   * For a list of entity IDs, finds which ones have aliases pointing to them.
   * Returns a map from entity ID → list of alias entity IDs.
   */
  private async findEntitiesWithAliases(entityIds: string[]): Promise<Map<string, string[]>> {
    const index = getLatestEntitiesIndexName(this.namespace);
    const response = await this.esClient.search<Record<string, unknown>>({
      index,
      size: MAX_SEARCH_RESPONSE_SIZE,
      query: {
        bool: {
          filter: [{ terms: { [RESOLVED_TO_FIELD]: entityIds } }],
        },
      },
      _source: [ENTITY_ID_FIELD, RESOLVED_TO_FIELD],
    });

    this.warnIfTruncated(response, 'findEntitiesWithAliases');

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
