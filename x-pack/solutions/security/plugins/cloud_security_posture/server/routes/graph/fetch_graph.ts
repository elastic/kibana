/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import { fetchEvents } from './fetch_events_graph';
import { fetchEntityRelationships } from './fetch_entity_relationships_graph';
import type { EsQuery, EntityId, OriginEventId, EventEdge, RelationshipEdge } from './types';

export { fetchEvents } from './fetch_events_graph';
export { fetchEntityRelationships } from './fetch_entity_relationships_graph';

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
}

export interface FetchGraphResult {
  events: EventEdge[];
  relationships: RelationshipEdge[];
}

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
}: FetchGraphParams): Promise<FetchGraphResult> => {
  // Fetch events
  const eventsPromise = fetchEvents({
    esClient,
    logger,
    start,
    end,
    originEventIds,
    showUnknownTarget,
    indexPatterns,
    spaceId,
    esQuery,
  });

  // Optionally fetch relationships in parallel when entityIds are provided
  const hasEntityIds = entityIds && entityIds.length > 0;

  const relationshipsPromise = hasEntityIds
    ? fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId,
      })
    : Promise.resolve([]);

  // Wait for both in parallel
  const [eventsResult, relationshipsResult] = await Promise.all([
    eventsPromise,
    relationshipsPromise,
  ]);

  logger.trace(
    `Fetched [events: ${eventsResult.records.length}] [relationships: ${relationshipsResult.length}]`
  );

  return {
    events: eventsResult.records,
    relationships: relationshipsResult,
  };
};
