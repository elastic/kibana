/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { createPatternMatcherService } from './privileged_status_match';
// TODO: fill in
export const createUpdateDetectionService = (dataClient: PrivilegeMonitoringDataClient) => {
  const privilegedStatusUpdateOperations = undefined; // = bulkPrivilegeStatusUpdateOperationsFactory(dataClient);
  const patternMatcherService = createPatternMatcherService(dataClient);

  const updateDetection = async (source: MonitoringEntitySource) => {
    // implement update detection logic
    dataClient.log('debug', `Checking for updates in integration source ${JSON.stringify(source)}`);

    const users = await patternMatcherService.findPrivilegedUsersFromMatchers(source);
    // logic to compare users for updating internal index
  };
  return {
    updateDetection,
  };
};
