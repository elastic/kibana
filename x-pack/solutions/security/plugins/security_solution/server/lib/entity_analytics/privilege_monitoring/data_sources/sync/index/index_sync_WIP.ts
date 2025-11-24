/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics/monitoring';
import type { PrivilegeMonitoringDataClient } from '../../../engine/data_client';
import { createSourcesSyncService } from '../sources_sync';

export type IndexSyncService = ReturnType<typeof createIndexSyncService>;

export const createIndexSyncService = (
  dataClient: PrivilegeMonitoringDataClient,
  maxUsersAllowed: number
) => {
  // TODO: implement update detection service for index sources
  const udateDetectionService = createIndexUpdateDetectionService(dataClient, soClient);
  const sourcesSyncService = createSourcesSyncService(dataClient);
  /**
   * Pattern matcher service to find privileged users based on matchers defined in saved objects
   */
  const indexSync = async (soClient: SavedObjectsClientContract) => {
    await sourcesSyncService.syncBySourceType({
      soClient,
      sourceType: 'index',
      process: async (source: MonitoringEntitySource) => {
        // process each index source
        await udateDetectionService.updateDetection(source); // TODO
      },
    });
  };

  return { indexSync };
};
