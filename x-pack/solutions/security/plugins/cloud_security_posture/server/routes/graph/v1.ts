/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { GraphResponse } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { fetchGraph, fetchEntityRelationships } from './fetch_graph';
import type { EsQuery, EntityId, OriginEventId } from './types';
import { parseRecords } from './parse_records';

interface GraphContextServices {
  logger: Logger;
  esClient: IScopedClusterClient;
}

export interface GetGraphParams {
  services: GraphContextServices;
  query: {
    originEventIds?: OriginEventId[];
    indexPatterns?: string[];
    spaceId?: string;
    start: string | number;
    end: string | number;
    esQuery?: EsQuery;
    entityIds?: EntityId[];
  };
  showUnknownTarget: boolean;
  nodesLimit?: number;
}

export const getGraph = async ({
  services: { esClient, logger },
  query: { originEventIds, spaceId = 'default', indexPatterns, start, end, esQuery, entityIds },
  showUnknownTarget,
  nodesLimit,
}: GetGraphParams): Promise<Pick<GraphResponse, 'nodes' | 'edges' | 'messages'>> => {
  indexPatterns = indexPatterns ?? [`.alerts-security.alerts-${spaceId}`, 'logs-*'];

  logger.trace(
    `Fetching graph for [originEventIds: ${
      originEventIds?.map((e) => e.id).join(', ') ?? 'none'
    }] in [spaceId: ${spaceId}] [indexPatterns: ${indexPatterns.join(',')}]`
  );

  // Fetch events (existing logic) - only if originEventIds are provided
  const eventResultsPromise = fetchGraph({
    esClient,
    showUnknownTarget,
    logger,
    start,
    end,
    originEventIds: originEventIds ?? [],
    indexPatterns,
    spaceId,
    esQuery,
  });

  // Optionally fetch relationships in parallel when entityIds are provided
  const hasEntityIds = entityIds && entityIds.length > 0;

  // relationships-test-target-1, relationships-test-target-2, standalone-entity-1
  // const relationshipResultsPromise = true
  //   ? fetchEntityRelationships({
  //       esClient,
  //       logger,
  //       entityIds: [
  //         { id: 'relationships-test-target-1', isOrigin: false },
  //         { id: 'relationships-test-target-2', isOrigin: false },
  //         { id: 'standalone-entity-1', isOrigin: false },
  //         { id: 'standalone-entity-2', isOrigin: true },
  //         { id: 'standalone-entity-3', isOrigin: false },
  //       ],
  //       spaceId,
  //     })
  //   : Promise.resolve([]);

  const relationshipResultsPromise = hasEntityIds
    ? fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId,
      })
    : Promise.resolve([]);

  // Wait for both in parallel
  const [eventResults, relationshipResults] = await Promise.all([
    eventResultsPromise,
    relationshipResultsPromise,
  ]);

  logger.trace(
    `Fetched [events: ${eventResults.records.length}] [relationships: ${relationshipResults.length}]`
  );

  return parseRecords(logger, eventResults.records, relationshipResults, nodesLimit);
};
