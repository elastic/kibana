/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Entity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import { getEntitiesIndexName } from '../entity_store/utils/entity_utils';
import type { LeadEntity } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_PAGE_SIZE = 1000;
const SUPPORTED_ENTITY_TYPES = ['user', 'host'] as const;

// ---------------------------------------------------------------------------
// Entity Retriever
//
// Centralises Entity Store V2 fetching so the generate-leads route, the
// assistant tool, and any future consumer (scheduled task, etc.) share a
// single code path for entity retrieval.
// ---------------------------------------------------------------------------

export interface EntityRetrieverDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
}

export interface EntityRetriever {
  /** Fetch all user and host entities from Entity Store V2 (paginated via search_after). */
  fetchAllEntities(): Promise<LeadEntity[]>;

  /** Fetch specific entities by type and name. */
  fetchEntitiesByName(
    entities: ReadonlyArray<{ entityType: string; entityName: string }>
  ): Promise<LeadEntity[]>;
}

export const createEntityRetriever = ({
  esClient,
  logger,
  spaceId,
}: EntityRetrieverDeps): EntityRetriever => ({
  async fetchAllEntities(): Promise<LeadEntity[]> {
    const records: Entity[] = [];

    for (const entityType of SUPPORTED_ENTITY_TYPES) {
      const index = getEntitiesIndexName(entityType, spaceId);
      let searchAfter: unknown[] | undefined;

      while (true) {
        try {
          const resp = await esClient.search<Entity>({
            index,
            size: ENTITY_PAGE_SIZE,
            ignore_unavailable: true,
            sort: [{ '@timestamp': { order: 'desc' } }, { _id: { order: 'asc' } }],
            ...(searchAfter ? { search_after: searchAfter } : {}),
            query: { match_all: {} },
          });

          const hits = resp.hits.hits;
          for (const hit of hits) {
            if (hit._source) records.push(hit._source);
          }

          if (hits.length < ENTITY_PAGE_SIZE) break;
          searchAfter = hits[hits.length - 1].sort as unknown[];
        } catch (error) {
          logger.warn(
            `[LeadGeneration][EntityRetriever] Failed to fetch ${entityType} records from "${index}": ${error}`
          );
          break;
        }
      }
    }

    logger.debug(
      `[LeadGeneration][EntityRetriever] Fetched ${records.length} entity records across ${SUPPORTED_ENTITY_TYPES.length} types`
    );

    return records.map(entityRecordToLeadEntity);
  },

  async fetchEntitiesByName(
    entities: ReadonlyArray<{ entityType: string; entityName: string }>
  ): Promise<LeadEntity[]> {
    if (entities.length === 0) return [];

    const byType = new Map<string, string[]>();
    for (const { entityType, entityName } of entities) {
      const existing = byType.get(entityType) ?? [];
      existing.push(entityName);
      byType.set(entityType, existing);
    }

    const records: Entity[] = [];
    for (const [entityType, names] of byType.entries()) {
      const index = getEntitiesIndexName(entityType, spaceId);

      try {
        const resp = await esClient.search<Entity>({
          index,
          size: names.length,
          ignore_unavailable: true,
          query: {
            bool: {
              filter: [{ terms: { [`${entityType}.name`]: names } }],
            },
          },
        });

        for (const hit of resp.hits.hits) {
          if (hit._source) records.push(hit._source);
        }
      } catch (error) {
        logger.warn(
          `[LeadGeneration][EntityRetriever] Failed to fetch ${entityType} records by name from "${index}": ${error}`
        );
      }
    }

    logger.debug(
      `[LeadGeneration][EntityRetriever] Fetched ${records.length} of ${entities.length} requested entities`
    );

    return records.map(entityRecordToLeadEntity);
  },
});

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * Convert an Entity Store V2 record into a LeadEntity, extracting the
 * convenience `type` and `name` fields from the nested `entity` object.
 */
export const entityRecordToLeadEntity = (record: Entity): LeadEntity => {
  const entityField = (record as Record<string, unknown>).entity as
    | { name?: string; type?: string }
    | undefined;
  return {
    record,
    type: entityField?.type ?? 'unknown',
    name: entityField?.name ?? 'unknown',
  };
};
