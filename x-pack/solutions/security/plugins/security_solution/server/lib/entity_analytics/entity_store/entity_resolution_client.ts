/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, IScopedClusterClient } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import type { EntityType as APIEntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import type { LinkEntitiesResponse } from '../../../../common/api/entity_analytics/entity_store/resolution/link_entities.gen';
import type { GetResolutionResponse } from '../../../../common/api/entity_analytics/entity_store/resolution/get_resolution.gen';
import type { ListResolutionsResponse } from '../../../../common/api/entity_analytics/entity_store/resolution/list_resolutions.gen';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { EntityStoreDataClient } from './entity_store_data_client';
import { EngineNotRunningError, BadCRUDRequestError } from './errors';
import { getEntitiesIndexName } from './utils';

const RESOLUTION_INDEX_PREFIX = '.entities.v1.resolution.security';

interface EntityResolutionClientOpts {
  logger: Logger;
  namespace: string;
  clusterClient: IScopedClusterClient;
  dataClient: EntityStoreDataClient;
}

interface ResolutionDocument {
  '@timestamp': string;
  entity_id: string;
  resolution_id: string;
}

/**
 * Get the resolution index name for a given entity type and namespace
 */
export function getResolutionIndexName(entityType: EntityType, namespace: string): string {
  return `${RESOLUTION_INDEX_PREFIX}_${entityType}_${namespace}`;
}

/**
 * Client for managing entity resolution
 */
export class EntityResolutionClient {
  private esClient: ElasticsearchClient;
  private namespace: string;
  private logger: Logger;
  private dataClient: EntityStoreDataClient;

  constructor({ clusterClient, namespace, logger, dataClient }: EntityResolutionClientOpts) {
    this.esClient = clusterClient.asCurrentUser;
    this.namespace = namespace;
    this.logger = logger;
    this.dataClient = dataClient;
  }

  /**
   * Generate a new resolution ID
   */
  private generateResolutionId(): string {
    return `res-${uuidv4()}`;
  }

  /**
   * Ensure the resolution index exists with proper mappings
   */
  private async ensureResolutionIndex(entityType: EntityType): Promise<void> {
    const indexName = getResolutionIndexName(entityType, this.namespace);

    const exists = await this.esClient.indices.exists({ index: indexName });
    if (!exists) {
      this.logger.info(`Creating resolution index: ${indexName}`);
      await this.esClient.indices.create({
        index: indexName,
        settings: {
          index: {
            number_of_shards: 1,
            number_of_replicas: 0,
            mode: 'lookup',
          },
        },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            entity_id: { type: 'keyword' },
            resolution_id: { type: 'keyword' },
          },
        },
      });
    }
  }

  /**
   * Get existing resolutions for entity IDs
   */
  private async getExistingResolutions(
    entityType: EntityType,
    entityIds: string[]
  ): Promise<Map<string, { resolution_id: string; doc_id: string }>> {
    const indexName = getResolutionIndexName(entityType, this.namespace);
    const resolutions = new Map<string, { resolution_id: string; doc_id: string }>();

    try {
      const result = await this.esClient.search<ResolutionDocument>({
        index: indexName,
        size: entityIds.length,
        query: {
          terms: { entity_id: entityIds },
        },
      });

      for (const hit of result.hits.hits) {
        if (hit._source && hit._id) {
          resolutions.set(hit._source.entity_id, {
            resolution_id: hit._source.resolution_id,
            doc_id: hit._id,
          });
        }
      }
    } catch (error) {
      // Index may not exist yet
      if ((error as { statusCode?: number }).statusCode !== 404) {
        throw error;
      }
    }

    return resolutions;
  }

  /**
   * Get all entities in a resolution group
   */
  private async getResolutionMembers(
    entityType: EntityType,
    resolutionId: string
  ): Promise<Array<{ entity_id: string; doc_id: string }>> {
    const indexName = getResolutionIndexName(entityType, this.namespace);

    try {
      const result = await this.esClient.search<ResolutionDocument>({
        index: indexName,
        size: 10000,
        query: {
          term: { resolution_id: resolutionId },
        },
      });

      return (
        result.hits.hits
          .filter((h) => h._source && h._id)
          .map((h) => ({
            entity_id: h._source!.entity_id,
            doc_id: h._id!,
          })) || []
      );
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Verify entities exist in Entity Store
   */
  private async verifyEntitiesExist(
    entityType: EntityType,
    entityIds: string[]
  ): Promise<{ found: string[]; missing: string[] }> {
    const indexName = getEntitiesIndexName(entityType, this.namespace);

    const result = await this.esClient.search({
      index: indexName,
      size: entityIds.length,
      _source: ['entity.id'],
      query: {
        terms: { 'entity.id': entityIds },
      },
    });

    const found = new Set(
      result.hits.hits
        .filter((h) => h._source)
        .map((h) => (h._source as { entity: { id: string } }).entity.id)
    );
    const missing = entityIds.filter((id) => !found.has(id));

    return { found: [...found], missing };
  }

  /**
   * Link entities into a resolution group
   *
   * API-1: Link Entities
   *
   * Behavior:
   * 1. If neither entity has a resolution → create new resolution_id, write documents
   * 2. If one entity has a resolution → add the other entities to that resolution
   * 3. If entities have different resolutions → merge all into one resolution_id
   */
  public async linkEntities(
    entityType: APIEntityType,
    entityIds: string[]
  ): Promise<LinkEntitiesResponse> {
    const type = EntityType[entityType];
    this.logger.info(`Linking entities: ${entityIds.join(', ')} (type: ${entityType})`);

    // Validate input
    if (entityIds.length < 2) {
      throw new BadCRUDRequestError('Need at least 2 entities to link');
    }

    // Verify engine is running
    const engineRunning = await this.dataClient.isEngineRunning(type);
    if (!engineRunning) {
      throw new EngineNotRunningError(entityType);
    }

    // Verify entities exist in Entity Store
    const { missing } = await this.verifyEntitiesExist(type, entityIds);
    if (missing.length > 0) {
      throw new BadCRUDRequestError(`Entities not found in Entity Store: ${missing.join(', ')}`);
    }

    // Ensure resolution index exists
    await this.ensureResolutionIndex(type);

    // Get existing resolutions
    const existingResolutions = await this.getExistingResolutions(type, entityIds);

    // Collect unique resolution IDs
    const uniqueResolutionIds = new Set<string>();
    for (const [, data] of existingResolutions) {
      uniqueResolutionIds.add(data.resolution_id);
    }

    let targetResolutionId: string;
    let created = 0;
    let updated = 0;
    const bulkOps: object[] = [];
    const now = new Date().toISOString();
    const indexName = getResolutionIndexName(type, this.namespace);

    if (uniqueResolutionIds.size === 0) {
      // Case 1: No existing resolutions - create new group
      targetResolutionId = this.generateResolutionId();
      this.logger.debug(`Case 1: Creating new resolution ${targetResolutionId}`);

      for (const entityId of entityIds) {
        bulkOps.push({ index: { _index: indexName } });
        bulkOps.push({
          '@timestamp': now,
          entity_id: entityId,
          resolution_id: targetResolutionId,
        });
        created++;
      }
    } else if (uniqueResolutionIds.size === 1) {
      // Case 2: One resolution exists - add others to it
      targetResolutionId = [...uniqueResolutionIds][0];
      this.logger.debug(`Case 2: Adding to existing resolution ${targetResolutionId}`);

      for (const entityId of entityIds) {
        if (!existingResolutions.has(entityId)) {
          bulkOps.push({ index: { _index: indexName } });
          bulkOps.push({
            '@timestamp': now,
            entity_id: entityId,
            resolution_id: targetResolutionId,
          });
          created++;
        }
      }
    } else {
      // Case 3: Multiple resolutions - merge all into one
      const resolutionIdArray = [...uniqueResolutionIds];
      targetResolutionId = resolutionIdArray[0]; // Keep the first one
      this.logger.debug(
        `Case 3: Merging ${uniqueResolutionIds.size} resolutions into ${targetResolutionId}`
      );

      // Get all members from other resolutions and update them
      for (let i = 1; i < resolutionIdArray.length; i++) {
        const otherResolutionId = resolutionIdArray[i];
        const members = await this.getResolutionMembers(type, otherResolutionId);

        for (const member of members) {
          bulkOps.push({ update: { _index: indexName, _id: member.doc_id } });
          bulkOps.push({ doc: { resolution_id: targetResolutionId, '@timestamp': now } });
          updated++;
        }
      }

      // Add any new entities not yet in any resolution
      for (const entityId of entityIds) {
        if (!existingResolutions.has(entityId)) {
          bulkOps.push({ index: { _index: indexName } });
          bulkOps.push({
            '@timestamp': now,
            entity_id: entityId,
            resolution_id: targetResolutionId,
          });
          created++;
        }
      }
    }

    // Execute bulk operation
    if (bulkOps.length > 0) {
      const bulkResult = await this.esClient.bulk({
        refresh: true,
        operations: bulkOps,
      });

      if (bulkResult.errors) {
        const errors = bulkResult.items
          .filter((item) => item.index?.error || item.update?.error)
          .map((item) => item.index?.error || item.update?.error);
        this.logger.error(`Bulk operation had errors: ${JSON.stringify(errors)}`);
      }
    }

    // Get final group members
    const finalMembers = await this.getResolutionMembers(type, targetResolutionId);

    return {
      resolution_id: targetResolutionId,
      entities: finalMembers.map((m) => m.entity_id),
      created,
      updated,
    };
  }

  /**
   * Get resolution status for an entity
   *
   * API-3: Get Resolution
   *
   * Returns the resolution group information for a given entity, or null values if not resolved.
   */
  public async getResolution(
    entityType: APIEntityType,
    entityId: string
  ): Promise<GetResolutionResponse> {
    const type = EntityType[entityType];
    this.logger.debug(`Getting resolution for entity: ${entityId} (type: ${entityType})`);

    // Verify engine is running
    const engineRunning = await this.dataClient.isEngineRunning(type);
    if (!engineRunning) {
      throw new EngineNotRunningError(entityType);
    }

    // Verify entity exists in Entity Store
    const { missing } = await this.verifyEntitiesExist(type, [entityId]);
    if (missing.length > 0) {
      throw new BadCRUDRequestError(`Entity not found in Entity Store: ${entityId}`);
    }

    // Get existing resolution for this entity
    const existingResolutions = await this.getExistingResolutions(type, [entityId]);
    const resolution = existingResolutions.get(entityId);

    if (!resolution) {
      // Entity is not resolved
      return {
        entity_id: entityId,
        resolution_id: null,
        group_members: [],
        '@timestamp': null,
      };
    }

    // Get all members in this resolution group
    const members = await this.getResolutionMembers(type, resolution.resolution_id);

    // Get the timestamp from the resolution document
    const indexName = getResolutionIndexName(type, this.namespace);
    let timestamp: string | null = null;

    try {
      const result = await this.esClient.search<ResolutionDocument>({
        index: indexName,
        size: 1,
        query: {
          term: { entity_id: entityId },
        },
      });

      if (result.hits.hits[0]?._source) {
        timestamp = result.hits.hits[0]._source['@timestamp'];
      }
    } catch (error) {
      // Ignore errors fetching timestamp
      this.logger.debug(`Could not fetch timestamp for entity ${entityId}: ${error}`);
    }

    return {
      entity_id: entityId,
      resolution_id: resolution.resolution_id,
      group_members: members.map((m) => m.entity_id),
      '@timestamp': timestamp,
    };
  }

  /**
   * List all resolutions for an entity type
   *
   * API-4: List Resolutions
   *
   * Returns all resolution documents for the given entity type.
   */
  public async listResolutions(entityType: APIEntityType): Promise<ListResolutionsResponse> {
    const type = EntityType[entityType];
    this.logger.debug(`Listing resolutions for entity type: ${entityType}`);

    // Verify engine is running
    const engineRunning = await this.dataClient.isEngineRunning(type);
    if (!engineRunning) {
      throw new EngineNotRunningError(entityType);
    }

    const indexName = getResolutionIndexName(type, this.namespace);

    try {
      const result = await this.esClient.search<ResolutionDocument>({
        index: indexName,
        size: 10000,
        query: {
          match_all: {},
        },
        sort: [{ resolution_id: 'asc' }, { entity_id: 'asc' }],
      });

      const resolutions = result.hits.hits
        .filter((h) => h._source)
        .map((h) => ({
          entity_id: h._source!.entity_id,
          resolution_id: h._source!.resolution_id,
          '@timestamp': h._source!['@timestamp'],
        }));

      return { resolutions };
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        // Index doesn't exist yet - return empty list
        return { resolutions: [] };
      }
      throw error;
    }
  }
}
