/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { FindMaintenanceWindowsResult } from '@kbn/maintenance-windows-plugin/common';
import { INITIAL_REST_VERSION } from '../../../../common/constants';
import { apiService } from '../../../utils/api_service';

const FIND_MAINTENANCE_WINDOWS_API = '/internal/alerting/rules/maintenance_window/_find';

/**
 * Fetches every maintenance window in the current space from the alerting endpoint.
 *
 * The monitor add/edit form needs the full list so an editor can assign a maintenance window
 * that no monitor references yet, so — unlike the overview — it goes through the privileged
 * alerting endpoint, which requires the `read-maintenance-window` privilege.
 */
export const useFetchAllMaintenanceWindows = () => {
  return useQuery(['synthetics', 'allMaintenanceWindows'], ({ signal }) =>
    apiService.get<FindMaintenanceWindowsResult>(
      FIND_MAINTENANCE_WINDOWS_API,
      {
        version: INITIAL_REST_VERSION,
        // Request the route's max page size so monitors attached to windows beyond the
        // default first page (10) still resolve their titles in the details panel and the
        // add/edit picker, instead of falling back to the raw window ID.
        per_page: 100,
      },
      undefined,
      { signal }
    )
  );
};
