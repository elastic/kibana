/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import type { SavedObjectsClientContract } from '@kbn/core/server';
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
    // get latest full sync from saved object
    const lastFullSyncMarker = await monitoringIndexSourceClient.getLastFullSyncMarker(source);
    if (lastFullSyncMarker) {
      return lastFullSyncMarker;
    }
    // otherwise, find the last fullSyncMarker from the index
    /**
     * So to get the last fullSyncMarker from the index, we need to:
     * 1. Find the syncMarkerIndex from the source
     * 2. Query the index for the latest fullSyncMarker
     * 3. Return the latest fullSyncMarker
     *
     * Should this be part of sync markers service OR the deletion detection service?
     */
  };

  return {
    updateLastProcessedMarker,
    getLastProcessedMarker,
    updateLastFullSyncMarker,
    getLastFullSyncMarker,
  };
};
