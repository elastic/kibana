/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorDetailsAppPath } from '../monitor_errors/error_details_url';
import type { MonitorStatusTimeBin } from './monitor_status_data';

export const getStatusChartClickPath = ({
  timeBin,
  configId,
  locationId,
  spaceId,
  remoteName,
}: {
  timeBin?: MonitorStatusTimeBin;
  configId?: string;
  locationId?: string;
  spaceId?: string;
  remoteName?: string;
}): string | undefined => {
  if (!timeBin || timeBin.downs <= 0 || !configId) {
    return undefined;
  }

  if (timeBin.stateId) {
    return getErrorDetailsAppPath({
      configId,
      stateId: timeBin.stateId,
      locationId,
      spaceId,
      remoteName,
    });
  }

  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (spaceId) params.set('spaceId', spaceId);
  if (remoteName) params.set('remoteName', remoteName);
  params.set('dateRangeStart', new Date(timeBin.start).toISOString());
  params.set('dateRangeEnd', new Date(timeBin.end).toISOString());
  return `/monitor/${configId}/errors?${params.toString()}`;
};
