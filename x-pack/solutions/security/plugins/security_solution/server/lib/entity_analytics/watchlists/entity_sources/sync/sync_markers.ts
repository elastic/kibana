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
    action: 'started' | 'completed'
  ): Promise<string | undefined> => {
    if (!source.integrations?.syncMarkerIndex) return undefined;
    const resp = await esClient.search<EventDoc>({
      index: source.integrations.syncMarkerIndex,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: 1,
      query: { term: { 'event.action': action } },
      _source: ['@timestamp'],
    });
    return resp?.hits?.hits?.[0]?._source?.['@timestamp'] ?? undefined;
  };

  const detectNewFullSync = async (source: MonitoringEntitySource): Promise<boolean> => {
    const lastFullSync = await descriptorClient.getLastFullSyncMarker(source);
    const latestCompletedEvent = await findLastEventMarkerInIndex(source, 'completed');
    if (!latestCompletedEvent) return false;

    const shouldUpdate = !lastFullSync || latestCompletedEvent > lastFullSync;
    if (!shouldUpdate) return false;

    await descriptorClient.updateLastFullSyncMarker(source, latestCompletedEvent);
    return true;
  };

  return {
    getLastProcessedMarker,
    updateLastProcessedMarker,
    findLastEventMarkerInIndex,
    detectNewFullSync,
  };
};
