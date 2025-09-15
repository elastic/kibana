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
import { createUpdateDetectionService } from './update_detection/update_detection';

export const createIntegrationsSyncService = (dataClient: PrivilegeMonitoringDataClient) => {
  const updateDetectionService = createUpdateDetectionService(dataClient);
  const sourcesSyncService = createSourcesSyncService(dataClient);

  const integrationsSync = async (soClient: SavedObjectsClientContract) => {
    await sourcesSyncService.syncBySourceType({
      soClient,
      sourceType: 'entity_analytics_integration',
      process: async (source: MonitoringEntitySource) => {
        // process each integration source
        await updateDetectionService.updateDetection(source);
        // await deletionDetectionService.deletionDetection(source);
      },
    });
  };

  return { integrationsSync };
};
