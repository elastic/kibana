/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { GraphResponse } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { fetchGraph } from './fetch_graph';
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

  const { events, relationships } = await fetchGraph({
    esClient,
    logger,
    start,
    end,
    originEventIds: originEventIds ?? [],
    showUnknownTarget,
    indexPatterns,
    spaceId,
    esQuery,
    entityIds,
  });

  return parseRecords(logger, events, relationships, nodesLimit);
};
