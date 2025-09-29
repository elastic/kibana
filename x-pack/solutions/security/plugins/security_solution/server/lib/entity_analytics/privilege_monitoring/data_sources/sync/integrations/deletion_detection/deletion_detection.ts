/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { createSyncMarkersService } from '../sync_markers/sync_markers';

export const createDeletionDetectionService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  // const bulkCompositeQueryOperations = undefined; // bulkQueryOperationsFactory(dataClient); // similar to csv
  const syncMarkerService = createSyncMarkersService(dataClient, soClient);
  const deletionDetection = async (source: MonitoringEntitySource) => {
    syncMarkerService.getLastFullSyncMarker(source);
    // for each integration source, find deletions since last full sync marker
    // mark those users as deleted in the main index
  };
  return {
    deletionDetection,
  };
};
