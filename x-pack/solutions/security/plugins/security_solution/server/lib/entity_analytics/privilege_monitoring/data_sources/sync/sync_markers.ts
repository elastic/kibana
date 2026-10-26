/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import { MonitoringEntitySourceDescriptorClient } from '../../saved_objects';

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

export const createSyncMarkersService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  const { deps } = dataClient;
  const monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
    soClient,
    namespace: deps.namespace,
  });
  const updateLastProcessedMarker = async (
    source: MonitoringEntitySource,
    lastProcessedMarker: string
  ): Promise<void> => {
    await monitoringIndexSourceClient.updateLastProcessedMarker(source, lastProcessedMarker);
  };
  const getLastProcessedMarker = async (source: MonitoringEntitySource): Promise<string> => {
    const lastProcessedMarker = await monitoringIndexSourceClient.getLastProcessedMarker(source);
    // if last processed doesn't exist, return default of now-1M. This is assumed first run for this source.
    if (!lastProcessedMarker) {
      return parseOrThrow(FIRST_RUN_DEFAULT_RANGE);
    } else {
      return lastProcessedMarker;
    }
  };

  const updateLastFullSyncMarker = async (
    source: MonitoringEntitySource,
    lastFullSyncMarker: string
  ): Promise<void> => {
    await monitoringIndexSourceClient.updateLastFullSyncMarker(source, lastFullSyncMarker);
  };

  const getLastFullSyncMarker = async (
    source: MonitoringEntitySource
  ): Promise<string | undefined> => {
    const fromSO = await monitoringIndexSourceClient.getLastFullSyncMarker(source);
    if (fromSO) return fromSO;
    return undefined;
  };

  const findLastEventMarkerInIndex = async (
    source: MonitoringEntitySource,
    action: 'started' | 'completed'
  ) => {
    // find the last event marker in the index
    const esClient = deps.clusterClient.asCurrentUser;
    const resp = await esClient.search<EventDoc>({
      index: source.integrations?.syncMarkerIndex,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: 1,
      query: {
        term: { 'event.action': action },
      },
      _source: ['@timestamp'],
    });
    const hit = resp?.hits?.hits?.[0]?._source?.['@timestamp'] ?? undefined;
    return hit;
  };

  const detectNewFullSync = async (source: MonitoringEntitySource): Promise<boolean> => {
    const lastFullSync = await getLastFullSyncMarker(source);
    const latestCompletedEvent = await findLastEventMarkerInIndex(source, 'completed');
    // No completed event found, no new full sync.
    if (!latestCompletedEvent) return false;

    // Decide if we should update (first marker OR newer than saved)
    const shouldUpdate = !lastFullSync || latestCompletedEvent > lastFullSync;

    if (!shouldUpdate) return false;
    await updateLastFullSyncMarker(source, latestCompletedEvent);
    return true;
  };

  return {
    updateLastProcessedMarker,
    getLastProcessedMarker,
    updateLastFullSyncMarker,
    getLastFullSyncMarker,
    detectNewFullSync,
    findLastEventMarkerInIndex,
  };
};
