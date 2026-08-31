/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getLatestEntitiesIndexName } from '@kbn/entity-store/server';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import type { Entity, RelationshipKind } from '@kbn/entity-store/common';
import { EntityField } from '@kbn/entity-store/common/domain/definitions/entity.gen';
import type { z } from '@kbn/zod/v4';
import type { AggregationsStringTermsAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { LeadEntity } from './types';
import { entityRecordToLeadEntity } from './entity_conversion';
import { getEntityField, errorMessage } from './observation_modules/utils';

export const EntityRelationshipsSchema = EntityField.shape.relationships
  .unwrap()
  .pick({
    administers: true,
    owns: true,
    accesses_infrequently: true,
    accesses_frequently: true,
    communicates_with: true,
  })
  .strip();
export type EntityRelationships = z.infer<typeof EntityRelationshipsSchema>;

export const ALL_KINDS = Object.keys(EntityRelationshipsSchema.shape) as ReadonlyArray<
  keyof EntityRelationships
>;
export type RelatedEntityKind = (typeof ALL_KINDS)[number];
export const INTERACTION_KINDS = [
  'accesses_frequently',
  'accesses_infrequently',
  'communicates_with',
] as const satisfies readonly RelationshipKind[];
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

export const getEntityRelationships = (entity: LeadEntity): undefined | EntityRelationships => {
  const entityField = getEntityField(entity);
  if (!entityField) return;

  const parsed = EntityRelationshipsSchema.safeParse(entityField.relationships);
  if (!parsed.success || parsed.data == null) return;

  return parsed.data;
};

/**
 * Create a map containing all the candidate entities and their related entities for easy lookup
 * First list all related entities for each candidate entity then fetch any missing
 * ones from the already fetched candidates list from the ES index to create complete map
 */
export const buildEntityLookupMap = async (
  candidatesEntities: LeadEntity[],
  esClient: ElasticsearchClient,
  spaceId: string,
  logger: Logger
): Promise<Map<string, LeadEntity>> => {
  const entitiesMap = new Map(candidatesEntities.map((entity) => [entity.id, entity]));

  // Collect all related entity IDs from the candidates
  const allRelatedIds = new Set<string>();
  for (const entity of candidatesEntities) {
    const relationships = getEntityRelationships(entity);
    if (relationships) {
      for (const relationship of Object.values(relationships)) {
        relationship.ids?.forEach((id) => allRelatedIds.add(id));
      }
    }
  }

  // identify which entities are not already fetched
  const missingEntitiesIds = Array.from(allRelatedIds).filter((id) => !entitiesMap.has(id));

  // fetch the missing entities from the ES index
  const fetchedRelatedEntities = await fetchMissingEntities(
    esClient,
    spaceId,
    missingEntitiesIds,
    logger
  );
  fetchedRelatedEntities.forEach((entity) => {
    entitiesMap.set(entity.id, entity);
  });

  return entitiesMap;
};

const MGET_CHUNK_SIZE = 1000;

const fetchMissingEntities = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  entitiesIds: readonly string[],
  logger: Logger
): Promise<LeadEntity[]> => {
  if (entitiesIds.length === 0) {
    return [];
  }

  const fetched: LeadEntity[] = [];
  try {
    for (let offset = 0; offset < entitiesIds.length; offset += MGET_CHUNK_SIZE) {
      const chunk = entitiesIds.slice(offset, offset + MGET_CHUNK_SIZE);
      const { docs } = await esClient.mget<Entity>({
        index: getLatestEntitiesIndexName(spaceId),
        ids: chunk.map(hashEuid),
        _source: [
          'entity.id',
          'entity.name',
          'entity.type',
          'entity.EngineMetadata.Type',
          'entity.risk.calculated_score_norm',
          'entity.risk.calculated_level',
          'asset.criticality',
          'user.name',
          'user.email',
          'host.name',
          'host.hostname',
          'service.name',
        ],
      });

      for (const doc of docs) {
        if ('found' in doc && doc.found && doc._source) {
          const lead = entityRecordToLeadEntity(doc._source);
          if (lead) {
            fetched.push(lead);
          }
        }
      }
    }
  } catch (error) {
    logger.warn(`[LeadGeneration] Failed to fetch related entities: ${errorMessage(error)}`);
  }

  return fetched;
};

type InteractionKindAggregations = Record<InteractionKind, AggregationsStringTermsAggregate>;

const idsFieldFor = (kind: InteractionKind): string => `entity.relationships.${kind}.ids`;

const TARGET_CHUNK_SIZE = 300;
/**
 * For each of `targetEuids`, counts how many distinct entities interact with it
 * under any {@link INTERACTION_KINDS} kind, returning the max count across kinds.
 */
export const countInteractingEntities = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  targetEuids: readonly string[],
  logger: Logger
): Promise<Map<string, number>> => {
  const counts = new Map<string, number>();
  if (targetEuids.length === 0) return counts;

  try {
    for (let offset = 0; offset < targetEuids.length; offset += TARGET_CHUNK_SIZE) {
      const selectedIds = targetEuids.slice(offset, offset + TARGET_CHUNK_SIZE);

      const response = await esClient.search<never, InteractionKindAggregations>({
        index: getLatestEntitiesIndexName(spaceId),
        size: 0,
        query: {
          bool: {
            should: INTERACTION_KINDS.map((kind) => ({
              terms: { [idsFieldFor(kind)]: selectedIds },
            })),
          },
        },
        aggs: Object.fromEntries(
          INTERACTION_KINDS.map((kind) => [
            kind,
            { terms: { field: idsFieldFor(kind), include: selectedIds, size: selectedIds.length } },
          ])
        ),
      });

      for (const kind of INTERACTION_KINDS) {
        const buckets = response.aggregations?.[kind]?.buckets;
        if (Array.isArray(buckets)) {
          for (const bucket of buckets) {
            const key = String(bucket.key);
            counts.set(key, Math.max(counts.get(key) ?? 0, bucket.doc_count));
          }
        }
      }
    }
  } catch (error) {
    logger.warn(`[LeadGeneration] Error counting interacting entities: ${errorMessage(error)}`);
  }

  return counts;
};
