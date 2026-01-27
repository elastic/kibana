/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { createSyncMarkersService } from '../../sync_markers';
import { isTimestampGreaterThan } from '../../utils';

interface SyncMarkersStrategy {
  getLastProcessedMarker: (source: MonitoringEntitySource) => Promise<string | undefined>;
  getSearchTimestamp: (timestamp?: string) => string | undefined;
  pickLaterTimestamp: (
    currentTimestamp?: string,
    candidateTimestamp?: string
  ) => string | undefined;
  updateLastProcessedMarker: (source: MonitoringEntitySource, timestamp?: string) => Promise<void>;
}

export const createSyncMarkersStrategy = (
  useSyncMarkers: boolean,
  syncMarkerService: ReturnType<typeof createSyncMarkersService>
): SyncMarkersStrategy => {
  if (!useSyncMarkers) {
    return {
      getLastProcessedMarker: async () => undefined,
      getSearchTimestamp: () => undefined,
      pickLaterTimestamp: () => undefined,
      updateLastProcessedMarker: async () => undefined,
    };
  }

  return {
    getLastProcessedMarker: (source) => syncMarkerService.getLastProcessedMarker(source),
    getSearchTimestamp: (timestamp) => timestamp,
    pickLaterTimestamp: (currentTimestamp, candidateTimestamp) => {
      if (!candidateTimestamp) {
        return currentTimestamp;
      }
      if (!currentTimestamp || isTimestampGreaterThan(candidateTimestamp, currentTimestamp)) {
        return candidateTimestamp;
      }
      return currentTimestamp;
    },
    updateLastProcessedMarker: (source, timestamp) =>
      syncMarkerService.updateLastProcessedMarker(source, ensureTimestamp(timestamp)),
  };
};

const ensureTimestamp = (timestamp?: string): string => {
  if (!timestamp) {
    throw new Error('Expected a timestamp before updating the last processed marker');
  }
  return timestamp;
};
