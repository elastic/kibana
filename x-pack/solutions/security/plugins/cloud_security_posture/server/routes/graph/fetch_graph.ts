/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import { fetchEvents } from './fetch_events_graph';
import { fetchEntities, fetchEntityRelationships } from './fetch_entity_relationships_graph';
import type {
  EsQuery,
  EntityId,
  OriginEventId,
  EventEdge,
  RelationshipEdge,
  EntityRecord,
} from './types';

export interface FetchGraphParams {
  esClient: IScopedClusterClient;
  logger: Logger;
  start: string | number;
  end: string | number;
  originEventIds: OriginEventId[];
  showUnknownTarget: boolean;
  indexPatterns: string[];
  spaceId: string;
  esQuery?: EsQuery;
  entityIds?: EntityId[];
  pinnedIds?: string[];
}

export interface FetchGraphResult {
  events: EventEdge[];
  relationships: RelationshipEdge[];
  entities: EntityRecord[];
}

const emptyEventsResult: EsqlToRecords<EventEdge> = { columns: [], records: [] };
const emptyRelationshipsResult: EsqlToRecords<RelationshipEdge> = { columns: [], records: [] };
const emptyEntitiesResult: EsqlToRecords<EntityRecord> = { columns: [], records: [] };

/**
 * Fetches graph data including both events and entity relationships.
 * Orchestrates parallel fetching of events from logs/alerts and relationships from entity store.
 */
export const fetchGraph = async ({
  esClient,
  logger,
  start,
  end,
  originEventIds,
  showUnknownTarget,
  indexPatterns,
  spaceId,
  esQuery,
  entityIds,
  pinnedIds,
}: FetchGraphParams): Promise<FetchGraphResult> => {
  // Only fetch events when originEventIds or esQuery are provided
  const hasOriginEventIds = originEventIds.length > 0;
  const hasEsQuery =
    !!esQuery?.bool.filter?.length ||
    !!esQuery?.bool.must?.length ||
    !!esQuery?.bool.should?.length ||
    !!esQuery?.bool.must_not?.length;

  const eventsPromise =
    hasOriginEventIds || hasEsQuery
      ? fetchEvents({
          esClient,
          logger,
          start,
          end,
          originEventIds,
          showUnknownTarget,
          indexPatterns,
          spaceId,
          esQuery,
          pinnedIds,
        }).catch((error) => {
          logger.error(`Failed to fetch events: ${error.message}`);
          throw error;
        })
      : Promise.resolve(emptyEventsResult);

  // Optionally fetch relationships in parallel when entityIds are provided
  const hasEntityIds = entityIds && entityIds.length > 0;

  const relationshipsPromise = hasEntityIds
    ? fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId,
      }).catch((error) => {
        logger.error(`Failed to fetch entity relationships: ${error.message}`);
        throw error;
      })
    : Promise.resolve(emptyRelationshipsResult);

  // We fetch the entities just in case they don't have any relationships. We would still like to see them in the graph.
  // These entities suppose to be pinned anyway. So there's no worry that they might be part of a group.
  const entitiesPromise = hasEntityIds
    ? fetchEntities({
        esClient,
        logger,
        entityIds,
        spaceId,
      }).catch((error) => {
        logger.error(`Failed to fetch entities: ${error.message}`);
        throw error;
      })
    : Promise.resolve(emptyEntitiesResult);

  // Wait for all in parallel
  const [eventsResult, relationshipsResult, entitiesResult] = await Promise.all([
    eventsPromise,
    relationshipsPromise,
    entitiesPromise,
  ]);

  logger.trace(
    `Fetched [events: ${eventsResult.records.length}] [relationships: ${relationshipsResult.records.length}]`
  );

  return {
    events: eventsResult.records,
    relationships: relationshipsResult.records,
    entities: entitiesResult.records,
  };
};
