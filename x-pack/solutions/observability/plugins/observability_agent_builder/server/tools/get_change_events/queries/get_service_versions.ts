/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import moment from 'moment';
import { orderBy, groupBy, mapValues } from 'lodash';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import { getTypedSearch } from '../../../utils/get_typed_search';
import { timeRangeFilter, termFilter } from '../../../utils/dsl_filters';
import { environmentFilter, getTraceIndices } from '../query_builders';

const MAX_SERVICES = 20;
const MAX_VERSIONS_PER_SERVICE = 10;

// Guard rails for N+1 query pattern
const MAX_TOTAL_VERSION_LOOKUPS = 30;
const CONCURRENCY_LIMIT = 5;

// Allow a small buffer before start to catch deployments at the boundary
const TOLERANCE_MINUTES = 5;

// How far back to look for the absolute first occurrence of a version
const LOOKBACK_DAYS = 30;

/**
 * Detects version changes by finding versions active in the window and checking if they *started* in that window.
 *
 * Strategy:
 * 1. Find all versions active in the requested `[start, end]` window.
 * 2. For each version, query its absolute "first seen" timestamp (looking back 30 days).
 * 3. Filter out versions where `firstSeen < start` (meaning they were already running before the window).
 *
 * Guard rails:
 * - Caps total version lookups to 30 to prevent excessive queries
 * - Limits concurrent queries to 5 to avoid overwhelming Elasticsearch
 */
export async function getServiceVersions({
  esClient,
  apmIndices,
  parsedTimeRange,
  serviceName,
  environment,
}: {
  esClient: IScopedClusterClient;
  apmIndices: APMIndices;
  parsedTimeRange: { start: number; end: number };
  serviceName?: string;
  environment?: string;
}) {
  // Step 1: Find all versions active in the requested window
  const activeVersions = await fetchActiveVersions({
    esClient,
    apmIndices,
    parsedTimeRange,
    serviceName,
    environment,
  });

  // Cap total lookups to prevent excessive queries
  const versionsToCheck = activeVersions.slice(0, MAX_TOTAL_VERSION_LOOKUPS);

  // Step 2: For each version, check if it's truly new (with concurrency limit)
  const limit = pLimit(CONCURRENCY_LIMIT);
  const lookbackStart = moment(parsedTimeRange.end).subtract(LOOKBACK_DAYS, 'days').valueOf();

  const versionResults = await Promise.all(
    versionsToCheck.map((v) =>
      limit(() =>
        checkIfVersionIsNew({
          esClient,
          apmIndices,
          service: v.service,
          version: v.version,
          lastSeen: v.lastSeen,
          lookbackStart,
          lookbackEnd: parsedTimeRange.end,
          windowStart: parsedTimeRange.start,
          environment,
        })
      )
    )
  );

  // Group and sort results by service
  return groupVersionsByService(versionResults.filter((r) => r !== null));
}

/**
 * Fetches all service versions active within the time window.
 */
async function fetchActiveVersions({
  esClient,
  apmIndices,
  parsedTimeRange,
  serviceName,
  environment,
}: {
  esClient: IScopedClusterClient;
  apmIndices: APMIndices;
  parsedTimeRange: { start: number; end: number };
  serviceName?: string;
  environment?: string;
}) {
  const search = getTypedSearch(esClient.asCurrentUser);
  const traceIndices = getTraceIndices(apmIndices);

  const response = await search({
    track_total_hits: false,
    index: traceIndices,
    size: 0,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', parsedTimeRange),
          ...termFilter('service.name', serviceName),
          ...environmentFilter(environment),
          { exists: { field: 'service.version' } },
        ],
      },
    },
    aggs: {
      services: {
        terms: { field: 'service.name', size: MAX_SERVICES },
        aggs: {
          versions: {
            terms: { field: 'service.version', size: MAX_VERSIONS_PER_SERVICE },
            aggs: {
              last_seen: { max: { field: '@timestamp' } },
            },
          },
        },
      },
    },
  });

  const serviceBuckets = response.aggregations?.services?.buckets ?? [];

  return serviceBuckets.flatMap((serviceBucket) =>
    serviceBucket.versions.buckets.map((versionBucket) => ({
      service: String(serviceBucket.key),
      version: String(versionBucket.key),
      lastSeen: versionBucket.last_seen.value_as_string ?? '',
    }))
  );
}

/**
 * Checks if a version was first deployed within the time window by querying its absolute first occurrence.
 */
async function checkIfVersionIsNew({
  esClient,
  apmIndices,
  service,
  version,
  lastSeen,
  lookbackStart,
  lookbackEnd,
  windowStart,
  environment,
}: {
  esClient: IScopedClusterClient;
  apmIndices: APMIndices;
  service: string;
  version: string;
  lastSeen: string;
  lookbackStart: number;
  lookbackEnd: number;
  windowStart: number;
  environment?: string;
}) {
  const search = getTypedSearch(esClient.asCurrentUser);
  const traceIndices = getTraceIndices(apmIndices);

  const response = await search({
    track_total_hits: false,
    index: traceIndices,
    size: 1,
    sort: [{ '@timestamp': 'asc' }],
    _source: ['@timestamp'],
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: lookbackStart, end: lookbackEnd }),
          { term: { 'service.name': service } },
          { term: { 'service.version': version } },
          ...environmentFilter(environment),
        ],
      },
    },
  });

  const firstHit = response.hits.hits[0];
  const source = firstHit?._source as { '@timestamp'?: string } | undefined;

  if (!source?.['@timestamp']) {
    return null;
  }

  const firstSeenTime = moment(source['@timestamp']).valueOf();
  const windowStartWithTolerance = moment(windowStart)
    .subtract(TOLERANCE_MINUTES, 'minutes')
    .valueOf();

  // Only include if it started within the requested window (with tolerance)
  if (firstSeenTime >= windowStartWithTolerance) {
    return {
      service,
      version,
      firstSeen: source['@timestamp'],
      lastSeen,
    };
  }

  return null;
}

/**
 * Groups version results by service and sorts by firstSeen.
 */
function groupVersionsByService(
  versions: Array<{ service: string; version: string; firstSeen: string; lastSeen: string }>
) {
  const grouped = groupBy(versions, 'service');

  return mapValues(grouped, (serviceVersions) =>
    orderBy(
      serviceVersions.map((v) => ({
        version: v.version,
        firstSeen: v.firstSeen,
        lastSeen: v.lastSeen,
      })),
      ['firstSeen'],
      ['asc']
    )
  );
}
