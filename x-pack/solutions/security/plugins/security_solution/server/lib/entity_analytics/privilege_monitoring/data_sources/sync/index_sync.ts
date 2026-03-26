/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics/monitoring';
import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import { createSourcesSyncService } from './sources_sync';
import { createIndexDeletionDetectionService } from './deletion_detection/index/deletion_detection';
import { createUpdateDetectionService } from './update_detection/update_detection';

export type IndexSyncService = ReturnType<typeof createIndexSyncService>;

export const createIndexSyncService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  const updateDetectionService = createUpdateDetectionService(dataClient, soClient, 'index');
  const deletionDetectionService = createIndexDeletionDetectionService(dataClient, soClient);
  const sourcesSyncService = createSourcesSyncService(dataClient);
  /**
   * Pattern matcher service to find privileged users based on matchers defined in saved objects
   */
  const plainIndexSync = async () => {
    await sourcesSyncService.syncBySourceType({
      soClient,
      sourceType: 'index',
      process: async (source: MonitoringEntitySource) => {
        // process each index source
        await updateDetectionService.updateDetection(source);
        // TODO: enable deletion detection once update detection is verified
        await deletionDetectionService.deletionDetection(source);
      },
    });
  };

  return { plainIndexSync };
};
