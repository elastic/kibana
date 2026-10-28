/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { apiService } from '../../../utils/api_service';
import type {
  SyntheticsMaintenanceWindow,
  SyntheticsMaintenanceWindowsResult,
} from '../../../../server/routes/maintenance_windows/get_maintenance_windows';

export type { SyntheticsMaintenanceWindow, SyntheticsMaintenanceWindowsResult };

// Maintenance windows change on a schedule (minutes to hours) and, for private locations,
// only take effect on the sync interval (5 minutes by default), so there is no value in
// polling more frequently than that.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Fetches the maintenance windows for the current space through the Synthetics-owned
 * endpoint, which resolves them with an internal client. This avoids the
 * `read-maintenance-window` privilege requirement of the alerting endpoints, so the data
 * is available to Synthetics read-only users as well.
 */
export const useFetchMaintenanceWindows = () => {
  return useQuery(
    ['synthetics', 'maintenanceWindows'],
    ({ signal }) =>
      apiService.get<SyntheticsMaintenanceWindowsResult>(
        SYNTHETICS_API_URLS.MAINTENANCE_WINDOWS,
        undefined,
        undefined,
        { signal }
      ),
    {
      refetchInterval: REFRESH_INTERVAL_MS,
    }
  );
};
