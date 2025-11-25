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
import { createIndexUpdateDetectionService } from './update_detection/update_detection';

export type IndexSyncService = ReturnType<typeof createIndexSyncService>;

export const createIndexSyncService = (
  dataClient: PrivilegeMonitoringDataClient,
  maxUsersAllowed: number,
  soClient: SavedObjectsClientContract
) => {
  const updateDetectionService = createIndexUpdateDetectionService(dataClient, soClient);
  const sourcesSyncService = createSourcesSyncService(dataClient);
  /**
   * Pattern matcher service to find privileged users based on matchers defined in saved objects
   */
  const indexSync = async () => {
    await sourcesSyncService.syncBySourceType({
      soClient,
      sourceType: 'index',
      process: async (source: MonitoringEntitySource) => {
        // process each index source
        await updateDetectionService.updateDetection(source); // TODO
      },
    });
  };

  return { indexSync };
};
