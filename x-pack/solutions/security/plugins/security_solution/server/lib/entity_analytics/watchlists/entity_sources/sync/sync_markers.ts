/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import type { WatchlistEntitySourceClient } from '../infra';

const FIRST_RUN_DEFAULT_RANGE = 'now-1M'; // on first run (update detection), look back over last month

interface EventDoc {
  '@timestamp': string;
  event?: { action?: 'started' | 'completed' };
}

const parseOrThrow = (expr: string): string => {
  const date = datemath.parse(expr);
  if (!date) throw new Error(`Invalid date math: ${expr}`);
  return date.toDate().toISOString();
};

export type WatchlistSyncMarkersService = ReturnType<typeof createWatchlistSyncMarkersService>;

export const createWatchlistSyncMarkersService = (
  descriptorClient: WatchlistEntitySourceClient,
  esClient: ElasticsearchClient
) => {
  const getLastProcessedMarker = async (source: MonitoringEntitySource): Promise<string> => {
    const lastProcessedMarker = await descriptorClient.getLastProcessedMarker(source);
    if (!lastProcessedMarker) {
      return parseOrThrow(FIRST_RUN_DEFAULT_RANGE);
    }
    return lastProcessedMarker;
  };

  const updateLastProcessedMarker = async (
    source: MonitoringEntitySource,
    lastProcessedMarker: string
  ): Promise<void> => {
    await descriptorClient.updateLastProcessedMarker(source, lastProcessedMarker);
  };

  const findLastEventMarkerInIndex = async (
    source: MonitoringEntitySource,
    action: 'started' | 'completed',
    atOrBefore?: string
  ): Promise<string | undefined> => {
    if (!source.integrations?.syncMarkerIndex) return undefined;
    const resp = await esClient.search<EventDoc>({
      index: source.integrations.syncMarkerIndex,
      ignore_unavailable: true,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: 1,
      query: atOrBefore
        ? {
            bool: {
              filter: [
                { term: { 'event.action': action } },
                { range: { '@timestamp': { lte: atOrBefore } } },
              ],
            },
          }
        : { term: { 'event.action': action } },
      _source: ['@timestamp'],
    });
    return resp?.hits?.hits?.[0]?._source?.['@timestamp'] ?? undefined;
  };

  const detectNewFullSync = async (
    source: MonitoringEntitySource
  ): Promise<{ hasNewFullSync: boolean; completedAt?: string }> => {
    const lastFullSync = await descriptorClient.getLastFullSyncMarker(source);
    const latestCompletedEvent = await findLastEventMarkerInIndex(source, 'completed');
    if (!latestCompletedEvent) return { hasNewFullSync: false };

    const hasNewFullSync = !lastFullSync || latestCompletedEvent > lastFullSync;
    return hasNewFullSync
      ? { hasNewFullSync, completedAt: latestCompletedEvent }
      : { hasNewFullSync };
  };

  /**
   * Persists that the full sync which completed at `completedAt` has been fully processed (its
   * window searched, upserted, and used for deletion detection), so `detectNewFullSync` won't
   * flag it again.
   */
  const markFullSyncProcessed = async (
    source: MonitoringEntitySource,
    completedAt: string
  ): Promise<void> => {
    await descriptorClient.updateLastFullSyncMarker(source, completedAt);
  };

  /**
   * Returns how far back update detection should look when a new full sync has just been
   * detected.
   *
   * A full sync re-crawls every entity from scratch, so to see everyone it found, update
   * detection needs to look back to when that crawl started — not just use the normal
   * incremental cursor (`lastUpdateProcessed`), which only covers recent changes and would miss
   * entities the crawl re-confirmed further back. The lookup is bounded to `completedAt` so it
   * finds the `started` marker belonging to *that* completed crawl, not a later, still
   * in-progress one — otherwise the window would only cover the newer crawl's partial output.
   * Falls back to the default lookback if the crawl has no `started` marker.
   */
  const getFullSyncWindowStart = async (
    source: MonitoringEntitySource,
    completedAt: string
  ): Promise<string> => {
    const startedMarker = await findLastEventMarkerInIndex(source, 'started', completedAt);
    return startedMarker ?? parseOrThrow(FIRST_RUN_DEFAULT_RANGE);
  };

  return {
    getLastProcessedMarker,
    updateLastProcessedMarker,
    findLastEventMarkerInIndex,
    detectNewFullSync,
    markFullSyncProcessed,
    getFullSyncWindowStart,
  };
};
