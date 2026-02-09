/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import { createDeletionDetectionService } from './deletion_detection/integrations/deletion_detection';
import { createSourcesSyncService } from './sources_sync';
import { createUpdateDetectionService } from './update_detection/update_detection';

export type IntegrationsSyncService = ReturnType<typeof createIntegrationsSyncService>;
export const createIntegrationsSyncService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  const updateDetectionService = createUpdateDetectionService(
    dataClient,
    soClient,
    'entity_analytics_integration'
  );
  const sourcesSyncService = createSourcesSyncService(dataClient);
  const deletionDetectionService = createDeletionDetectionService(dataClient, soClient);

  const integrationsSync = async () => {
    await sourcesSyncService.syncBySourceType({
      soClient,
      sourceType: 'entity_analytics_integration',
      process: async (source: MonitoringEntitySource) => {
        // process each integration source
        await updateDetectionService.updateDetection(source);
        await deletionDetectionService.deletionDetection(source);
      },
    });
  };

  return { integrationsSync };
};
