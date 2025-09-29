/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Aggregate } from '@kbn/session-view-plugin/common';
import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { MonitoringEntitySourceDescriptorClient } from '../../../../saved_objects';

const FIRST_RUN_DEFAULT_RANGE = 'now-1M'; // on first run, look back over last month

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

  const updateLastFullSyncMarker = async (marker: string): Promise<void> => {
    // update latest full sync to saved object
  };

  const getLastFullSyncMarker = async (
    source: MonitoringEntitySource
  ): Promise<string | undefined> => {
    // Try from the SO first
    const fromSO = await monitoringIndexSourceClient.getLastFullSyncMarker(source);
    if (fromSO) return fromSO;

    // Fallback: search index
    const fromIndex = await findLastFullSyncMarkerInIndex(source);
    if (!fromIndex) return undefined;

    // Update the SO for next time
    await updateLastFullSyncMarker(fromIndex);
    return fromIndex;
  };

  const findLastFullSyncMarkerInIndex = async (
    source: MonitoringEntitySource
  ): Promise<string | undefined> => {
    // find the last full sync marker in the index
    const esClient = deps.clusterClient.asCurrentUser;
    const resp = await esClient.search<never, Aggregate>({
      index: source.integrations?.syncMarkerIndex,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: 1,
      query: {
        term: { 'event.action': 'completed' },
      },
      _source: ['@timestamp'],
    });
    const hit = resp?.hits?.hits?.[0]?._source?.['@timestamp'] ?? undefined;
    return hit;
  };

  return {
    updateLastProcessedMarker,
    getLastProcessedMarker,
    updateLastFullSyncMarker,
    getLastFullSyncMarker,
  };
};
