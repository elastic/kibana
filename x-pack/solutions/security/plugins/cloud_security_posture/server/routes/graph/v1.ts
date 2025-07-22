/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { GraphResponse } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { fetchGraph } from './fetch_graph';
import type { EsQuery, OriginEventId } from './types';
import { parseRecords } from './parse_records';

interface GraphContextServices {
  logger: Logger;
  esClient: IScopedClusterClient;
}

interface GetGraphParams {
  services: GraphContextServices;
  query: {
    originEventIds: OriginEventId[];
    spaceId?: string;
    start: string | number;
    end: string | number;
    esQuery?: EsQuery;
  };
  showUnknownTarget: boolean;
  nodesLimit?: number;
}

export const getGraph = async ({
  services: { esClient, logger },
  query: { originEventIds, spaceId = 'default', start, end, esQuery },
  showUnknownTarget,
  nodesLimit,
}: GetGraphParams): Promise<Pick<GraphResponse, 'nodes' | 'edges' | 'messages'>> => {
  logger.trace(
    `Fetching graph for [originEventIds: ${originEventIds.join(', ')}] in [spaceId: ${spaceId}]`
  );

  const results = await fetchGraph({
    esClient,
    showUnknownTarget,
    logger,
    start,
    end,
    originEventIds,
    esQuery,
  });

  // Convert results into set of nodes and edges
  return parseRecords(logger, results.records, nodesLimit);
};
