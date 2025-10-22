/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import type { Processor } from '../../saved_objects';
import { MonitoringEntitySourceDescriptorClient } from '../../saved_objects';
import type { MonitoringEntitySyncType } from '../../types';

export const createSourcesSyncService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps } = dataClient;

  const syncBySourceType = async ({
    soClient,
    sourceType,
    process,
  }: {
    soClient: SavedObjectsClientContract;
    sourceType: MonitoringEntitySyncType;
    process: Processor;
  }): Promise<void> => {
    const monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: deps.namespace,
    });
    const sources = await monitoringIndexSourceClient.findSourcesByType(sourceType); // this will be index or integration
    if (sources.length === 0) {
      dataClient.log('debug', `No ${sourceType} monitoring sources found. Skipping sync.`);
      return;
    }
    const results = await Promise.allSettled(sources.map((s) => process(s)));
    results.forEach((result) => {
      if (result.status === 'rejected') {
        dataClient.log('warn', `Source processing failed: ${String(result.reason)}`);
      }
    });
  };

  return {
    syncBySourceType,
  };
};
