/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
// TODO: fill in
export const createUpdateDetectionService = (dataClient: PrivilegeMonitoringDataClient) => {
  const privilegedUsersFromMatchers = undefined; //  = findPrivilegedUsersFromMatchers(dataClient);
  const privilegedStatusUpdateOperations = undefined; // = bulkPrivilegeStatusUpdateOperationsFactory(dataClient);
  const updateDetection = async (source: MonitoringEntitySource) => {
    // implement update detection logic
    dataClient.log('debug', `Checking for updates in integration source ${JSON.stringify(source)}`);
  };
  return {
    privilegedUsersFromMatchers,
    privilegedStatusUpdateOperations,
    updateDetection,
  };
};
