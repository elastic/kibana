/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../engine/data_client';
import type { PrivMonBulkUser } from '../../../types';
import { applyPrivilegedUpdates } from './queries';

export const createPrivilegeStatusUpdateService = (dataClient: PrivilegeMonitoringDataClient) => {
  const updatePrivilegedStatus = async (
    users: PrivMonBulkUser[],
    source: MonitoringEntitySource
  ) => {
    dataClient.log('debug', `Updating internal index for users ${users.length}`);
    await applyPrivilegedUpdates({ users, dataClient, source });
  };

  return {
    updatePrivilegedStatus,
  };
};
