/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics/monitoring';
import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import { MonitoringEntitySourceDescriptorClient } from '../../saved_objects';
import type { MonitoringEntitySourceType } from '../../types';

type Processor<T = void> = (source: MonitoringEntitySource) => Promise<T>;

export const createSourcesSyncService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps } = dataClient;

  const syncBySourceType = async ({
    soClient,
    sourceType,
    process,
  }: {
    soClient: SavedObjectsClientContract;
    sourceType: MonitoringEntitySourceType;
    process: Processor;
  }): Promise<void> => {
    const monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: deps.namespace,
    });
    const sources = await monitoringIndexSourceClient.findBySourceType(sourceType); // this will be index or integration
    if (sources.length === 0) {
      dataClient.log('debug', `No ${sourceType} monitoring sources found. Skipping sync.`);
      return;
    }
    for (const s of sources) {
      await process(s); // process each source
    }
  };

  return {
    syncBySourceType,
  };
};
