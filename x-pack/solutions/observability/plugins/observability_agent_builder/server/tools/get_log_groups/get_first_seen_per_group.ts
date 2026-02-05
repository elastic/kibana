/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import moment from 'moment';
import type { Logger } from '@kbn/core/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import { ERROR_GROUP_ID } from '@kbn/apm-types/es_fields';
import type { ApmEventClient } from './types';
import type { SpanExceptionSample } from './get_span_exception_groups';
import { getTotalHits } from '../../utils/get_total_hits';

const LOOKBACK_DAYS = 7;

/**
 * Fetches "first seen" for each error group using a lookback window (7 days)
 * This helps distinguish new errors from recurring ones.
 *
 * This is a two-step process:
 * 1. Find the earliest occurrence within the lookback window (possibly slow, but time-range-bounded).
 * 2. In parallel, check which error groups existed before the lookback window (not time-range-bounded, but very fast with terminate_after: 1).
 *
 * Returns an exact ISO timestamp for recent error (first seen within 7 days), or "over 7 days ago" otherwise.
 */
export async function getFirstSeenPerGroup({
  apmEventClient,
  spanExceptionSamples: errorGroups,
  endMs,
  logger,
}: {
  apmEventClient: ApmEventClient;
  spanExceptionSamples: SpanExceptionSample[];
  endMs: number;
  logger: Logger;
}): Promise<Map<string, string>> {
  const groupIds = compact(
    errorGroups.map((errorGroup) => errorGroup.sample[ERROR_GROUP_ID] as string)
  );

  if (groupIds.length === 0) {
    return new Map();
  }

  logger.debug(`Fetching firstSeen for ${groupIds.length} error groups`);

  const lookbackStartMs = moment(endMs).subtract(LOOKBACK_DAYS, 'days').valueOf();

  // Run both queries in parallel
  const [firstSeenWithinWindow, groupsSeenBeforeWindow] = await Promise.all([
    getFirstSeenWithinWindow({
      apmEventClient,
      groupIds,
      startMs: lookbackStartMs,
      endMs,
    }),
    getGroupsSeenBeforeWindow({
      apmEventClient,
      groupIds,
      beforeMs: lookbackStartMs,
    }),
  ]);

  // Combine results: if existed before the lookback window, return "over X days ago"
  // Otherwise, return the exact timestamp from within the window
  const entries = compact(
    groupIds.map((groupId) => {
      if (groupsSeenBeforeWindow.includes(groupId)) {
        return [groupId, `over ${LOOKBACK_DAYS} days ago`] as const;
      }
      const timestamp = firstSeenWithinWindow.get(groupId);
      if (timestamp != null) {
        const firstSeen = new Date(timestamp).toISOString();
        return [groupId, firstSeen] as const;
      }
    })
  );

  return new Map(entries);
}

/**
 * Gets the earliest timestamp for each group within the lookback window.
 */
async function getFirstSeenWithinWindow({
  apmEventClient,
  groupIds,
  startMs,
  endMs,
}: {
  apmEventClient: ApmEventClient;
  groupIds: string[];
  startMs: number;
  endMs: number;
}): Promise<Map<string, number | null>> {
  const response = await apmEventClient.search('get_error_groups_first_seen_within_window', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          { terms: { [ERROR_GROUP_ID]: groupIds } },
          {
            range: {
              '@timestamp': {
                gte: startMs,
                lte: endMs,
              },
            },
          },
        ],
      },
    },
    aggs: {
      groups: {
        terms: {
          field: ERROR_GROUP_ID,
          size: groupIds.length,
        },
        aggs: {
          first_seen: { min: { field: '@timestamp' } },
        },
      },
    },
  });

  const entries = compact(
    (response.aggregations?.groups?.buckets ?? []).map((bucket) => {
      const firstSeen = bucket.first_seen?.value;
      return [bucket.key as string, firstSeen] as const;
    })
  );

  return new Map(entries);
}

/**
 * Checks which groups existed before the lookback window using parallel queries.
 * Uses terminate_after: 1 per group for maximum efficiency.
 */
async function getGroupsSeenBeforeWindow({
  apmEventClient,
  groupIds,
  beforeMs,
}: {
  apmEventClient: ApmEventClient;
  groupIds: string[];
  beforeMs: number;
}): Promise<string[]> {
  // Build individual search params for each group
  const searches = groupIds.map((groupId) => ({
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    terminate_after: 1,
    track_total_hits: 1,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [ERROR_GROUP_ID]: groupId } },
          {
            range: {
              '@timestamp': {
                lt: beforeMs,
              },
            },
          },
        ],
      },
    },
  }));

  const { responses } = await apmEventClient.msearch(
    'get_error_groups_existed_before_window',
    ...searches
  );

  return groupIds.filter((_, i) => getTotalHits(responses[i]) > 0);
}
