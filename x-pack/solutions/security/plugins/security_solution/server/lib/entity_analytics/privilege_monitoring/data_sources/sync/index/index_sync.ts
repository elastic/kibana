/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PrivilegeMonitoringDataClient } from '../../../engine/data_client';
import { PrivMonBulkUser } from '../../../types';
import { MonitoringEntitySourceDescriptorClient } from '../../../saved_objects';

export type IndexSyncService = ReturnType<typeof createIndexSyncService>;

export const createIndexSyncService = (
  dataClient: PrivilegeMonitoringDataClient,
  maxUsersAllowed: number
) => {
  const { deps } = dataClient;
  const esClient = deps.clusterClient.asCurrentUser;
  /**
   * Pattern matcher service to find privileged users based on matchers defined in saved objects
   */
  const indexSync = async (soClient: SavedObjectsClientContract) => {
    const monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: deps.namespace,
    });
    // get all monitoring index source saved objects of type 'index_sync'
    const indexSources = await monitoringIndexSourceClient.findSourcesByType('index');
    if (indexSources.length === 0) {
      dataClient.log('debug', 'No monitoring index sources found. Skipping sync.');
      return;
    }

    dataClient.log(
      'info',
      `Privilege monitoring sync started - Maximum supported number of privileged users allowed: ${maxUsersAllowed}`
    );
    // want to get all the users from matchers?
  };

  return { indexSync };
};
