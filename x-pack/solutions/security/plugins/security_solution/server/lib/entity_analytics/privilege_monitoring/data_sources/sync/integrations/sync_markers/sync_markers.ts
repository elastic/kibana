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

  return {
    updateLastProcessedMarker,
    getLastProcessedMarker,
  };
};
