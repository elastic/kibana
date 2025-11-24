/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server/src/saved_objects_client';
import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics/monitoring/monitoring_entity_source/monitoring_entity_source.gen';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { createPatternMatcherService } from '../../integrations/update_detection/privileged_status_match';
import type { PrivMonBulkUser } from '../../../../types';

export const createIndexUpdateDetectionService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  const patternMatcherService = createPatternMatcherService({
    dataClient,
    soClient,
    sourceType: 'index',
  });
  const updateDetection = async (source: MonitoringEntitySource) => {
    /**
     * 1. Get privileged users from the index source using pattern matchers
     * 2. Update their privileged status in the internal index using statusUpdateService
     * 3. Log the completion of the update detection process
     */
    const users: PrivMonBulkUser[] = await patternMatcherService.findPrivilegedUsersFromMatchers(
      source
    );
  };
  return {
    updateDetection,
  };
};
