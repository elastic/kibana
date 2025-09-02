/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegeMonitoringDataClient } from '../../../engine/data_client';

export const createIntegrationsSyncService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps } = dataClient;
  const esClient = deps.clusterClient.asCurrentUser;

  const updateDetectionService = undefined; // createUpdateDetectionService(); // will you need data client in here? Avoid?
  const deletionDetectionService = undefined; // createDeletionDetectionService(); // will you need data client in here? Avoid?

  const integrationsSync = async () => {
    // implementation
  };

  return { integrationsSync };
};
