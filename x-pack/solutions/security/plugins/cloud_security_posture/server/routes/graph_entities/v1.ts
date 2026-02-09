/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { EntitiesResponse } from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import { fetchEntities } from './fetch';
import { parseEntityRecords } from './parse';

interface DocumentDetailsContextServices {
  logger: Logger;
  esClient: IScopedClusterClient;
}

export interface GetEntitiesParams {
  services: DocumentDetailsContextServices;
  query: {
    entityIds: string[];
    start: string | number;
    end: string | number;
    indexPatterns?: string[];
  };
  spaceId?: string;
  nodesLimit?: number;
  page: {
    index: number;
    size: number;
  };
}

/**
 * Fetches and enriches entity details from events/alerts and entity store.
 */
export const getEntities = async ({
  services: { esClient, logger },
  query: { entityIds, indexPatterns, start, end },
  spaceId = 'default',
  nodesLimit,
  page,
}: GetEntitiesParams): Promise<EntitiesResponse> => {
  logger.trace(`Fetching entities [entityIds count: ${entityIds.length}] in [spaceId: ${spaceId}]`);

  // Server-side pagination: slice IDs before querying ESQL
  const startIndex = page.index * page.size;
  const endIndex = startIndex + page.size;
  const pageEntityIds = entityIds.slice(startIndex, endIndex);

  logger.trace(
    `Paginating entities: page ${page.index}, size ${page.size}, sliced ${pageEntityIds.length} of ${entityIds.length} IDs`
  );

  const results = await fetchEntities({
    esClient,
    logger,
    entityIds: pageEntityIds,
    start,
    end,
    indexPatterns,
    spaceId,
    nodesLimit,
  });

  const response = parseEntityRecords(logger, results.records, pageEntityIds, nodesLimit);

  return {
    ...response,
    totalRecords: entityIds.length,
  };
};
