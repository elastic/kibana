/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { EventsResponse } from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import { fetchEvents } from './fetch';
import { parseEventRecords } from './parse';

interface DocumentDetailsContextServices {
  logger: Logger;
  esClient: IScopedClusterClient;
}

export interface GetEventsParams {
  services: DocumentDetailsContextServices;
  query: {
    eventIds: string[];
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
 * Fetches and enriches event/alert details.
 */
export const getEvents = async ({
  services: { esClient, logger },
  query: { eventIds, indexPatterns, start, end },
  spaceId = 'default',
  nodesLimit,
  page,
}: GetEventsParams): Promise<EventsResponse> => {
  // Default index patterns if not provided
  const resolvedIndexPatterns = indexPatterns ?? [`.alerts-security.alerts-${spaceId}`, 'logs-*'];

  logger.trace(
    `Fetching events [eventIds count: ${
      eventIds.length
    }] in [spaceId: ${spaceId}] [indexPatterns: ${resolvedIndexPatterns.join(',')}]`
  );

  // Server-side pagination: slice IDs before querying ESQL
  const startIndex = page.index * page.size;
  const endIndex = startIndex + page.size;
  const pageEventIds = eventIds.slice(startIndex, endIndex);

  logger.trace(
    `Paginating events: page ${page.index}, size ${page.size}, sliced ${pageEventIds.length} of ${eventIds.length} IDs`
  );

  const results = await fetchEvents({
    esClient,
    logger,
    eventIds: pageEventIds,
    start,
    end,
    indexPatterns: resolvedIndexPatterns,
    spaceId,
    nodesLimit,
  });

  const response = parseEventRecords(logger, results.records, nodesLimit);

  return {
    ...response,
    totalRecords: eventIds.length,
  };
};
