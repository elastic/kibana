/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindMaintenanceWindowsResult } from '@kbn/maintenance-windows-plugin/common';
import { INITIAL_REST_VERSION } from '../../../../../common/constants';
import { apiService } from '../../../../utils/api_service/api_service';

export const getMaintenanceWindows = async (): Promise<FindMaintenanceWindowsResult> => {
  return apiService.get<FindMaintenanceWindowsResult>(
    '/internal/alerting/rules/maintenance_window/_find',
    {
      version: INITIAL_REST_VERSION,
      // Request the route's max page size so monitors attached to windows beyond
      // the default first page (10) still resolve their titles in the details panel
      // and the add/edit picker, instead of falling back to the raw window ID.
      per_page: 100,
    }
  );
};
