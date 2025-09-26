/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';

const FIRST_RUN_DEFAULT_RANGE = 'now-1M'; // on first run, look back over last month

const parseOrThrow = (expr: string): string => {
  const date = datemath.parse(expr);
  if (!date) throw new Error(`Invalid date math: ${expr}`);
  return date.toDate().toISOString();
};

export const createSyncMarkersService = (dataClient: PrivilegeMonitoringDataClient) => {
  const updateLastProcessedMarker = async (marker: string): Promise<void> => {
    // update latest processed to saved object
    // eslint-disable-next-line no-console
    console.log('Updating last processed marker to', marker);
  };
  const getLastProcessedMarker = async (): Promise<string> => {
    // replace with check if saved object exists
    const firstRun = true;
    // if(!so.lastProcessed) { firstRun = true } just do the return below, no need for extra boolean
    if (firstRun) {
      return parseOrThrow(FIRST_RUN_DEFAULT_RANGE);
    }
    return 'now-10y'; // replace with actual value from saved object
  };

  const updateLastFullSyncMarker = async (namespace: string, marker: string): Promise<void> => {
    // update latest full sync to saved object
  };
  const getLastFullSyncMarker = async (namespace: string): Promise<string> => {
    // get latest full sync from saved object
    return 'now-10y'; // replace with actual value from saved object
  };

  return {
    updateLastProcessedMarker,
    getLastProcessedMarker,
    updateLastFullSyncMarker,
    getLastFullSyncMarker,
  };
};
