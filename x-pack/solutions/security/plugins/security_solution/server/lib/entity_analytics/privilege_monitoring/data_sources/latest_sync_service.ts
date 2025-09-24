/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';
import { MonitoringEntitySourceDescriptorClient } from '../saved_objects';

export const latestSyncService = (
  soClient: SavedObjectsClientContract,
  dataClient: PrivilegeMonitoringDataClient
) => {
  const { deps } = dataClient;
  const monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
    soClient,
    namespace: deps.namespace,
  });
  const updateLatestSync = async () => {
    /**
     * 1. When was the latest sync?
     * 2. Update the latest sync timestamp on the Saved Object
     */
    // need to get the indexPattern of entity okta from the saved object
  };
};
