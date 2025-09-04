/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PrivilegeMonitoringDataClient } from '../../../engine/data_client';
import { MonitoringEntitySourceDescriptorClient } from '../../../saved_objects';

export const createIntegrationsSyncService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps } = dataClient;
  const esClient = deps.clusterClient.asCurrentUser;

  const updateDetectionService = undefined; // createUpdateDetectionService(); // will you need data client in here? Avoid?
  const deletionDetectionService = undefined; // createDeletionDetectionService(); // will you need data client in here? Avoid?

  const integrationsSync = async (soClient: SavedObjectsClientContract) => {
    /**
     * 1. From the saved object pull in the integrations index patterns
     * 2. For each of these, check - does it exist?
     * 3. If it does not exist, abort
     */
    const monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: deps.namespace,
    });
  };

  return { integrationsSync };
};
