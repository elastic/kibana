/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import type { PrivMonOktaIntegrationsUser } from '../../../../types';
import { applyPrivilegedUpdates } from './queries';

export const createPrivilegeStatusUpdateService = (dataClient: PrivilegeMonitoringDataClient) => {
  const updatePrivilegedStatus = async (users: PrivMonOktaIntegrationsUser[]) => {
    dataClient.log('info', `Updating internal index for users: ${JSON.stringify(users, null, 2)}`);
    await applyPrivilegedUpdates({ users, dataClient });
  };

  return {
    updatePrivilegedStatus,
  };
};
