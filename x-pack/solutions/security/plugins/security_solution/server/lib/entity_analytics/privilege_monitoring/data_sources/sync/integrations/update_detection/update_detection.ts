/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import type { PrivMonIntegrationsUser } from '../../../../types';
import { createPatternMatcherService } from './privileged_status_match';
import { createPrivilegeStatusUpdateService } from './privileged_status_update';
export const createUpdateDetectionService = (dataClient: PrivilegeMonitoringDataClient) => {
  const statusUpdateService = createPrivilegeStatusUpdateService(dataClient);
  const patternMatcherService = createPatternMatcherService(dataClient);

  const updateDetection = async (source: MonitoringEntitySource) => {
    const users: PrivMonIntegrationsUser[] =
      await patternMatcherService.findPrivilegedUsersFromMatchers(source);
    await statusUpdateService.updatePrivilegedStatus(users);
    dataClient.log(
      'info',
      `Completed update detection for source ${source.id}. Processed ${users.length} users.`
    );
  };
  return {
    updateDetection,
  };
};
