/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';
import type { MonitoringEntitySourceDescriptorClient } from '../../../privilege_monitoring/saved_objects';

const FIRST_RUN_DEFAULT_RANGE = 'now-1M'; // on first run (update detection), look back over last month

const parseOrThrow = (expr: string): string => {
  const date = datemath.parse(expr);
  if (!date) throw new Error(`Invalid date math: ${expr}`);
  return date.toDate().toISOString();
};

export type WatchlistSyncMarkersService = ReturnType<typeof createWatchlistSyncMarkersService>;

export const createWatchlistSyncMarkersService = (
  descriptorClient: MonitoringEntitySourceDescriptorClient
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

  return {
    getLastProcessedMarker,
    updateLastProcessedMarker,
  };
};
