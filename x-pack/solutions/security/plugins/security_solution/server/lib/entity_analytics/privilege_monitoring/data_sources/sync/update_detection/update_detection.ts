/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { uniq } from 'lodash';
import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../engine/data_client';
import type { MonitoringEntitySyncType, PrivMonBulkUser } from '../../../types';
import { createPatternMatcherService } from './matchers/privileged_status_match';
import { createPrivilegeStatusUpdateService } from './privileged_status_update';

export const createUpdateDetectionService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract,
  sourceType: MonitoringEntitySyncType
) => {
  const patternMatcherService = createPatternMatcherService({
    dataClient,
    soClient,
    sourceType,
  });
  const statusUpdateService = createPrivilegeStatusUpdateService(dataClient);
  const updateDetection = async (source: MonitoringEntitySource) => {
    const users: PrivMonBulkUser[] = await patternMatcherService.findPrivilegedUsersFromMatchers(
      source
    );

    await statusUpdateService.updatePrivilegedStatus(uniq(users), source); // ensure users are unique before updating
    dataClient.log(
      'info',
      `Index Update Detection: Found ${users.length} users from index source ${source.id}`
    );
    return users;
  };
  return {
    updateDetection,
  };
};
