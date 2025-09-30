/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syntheticsMonitorDetailLocatorID } from '@kbn/observability-plugin/common';
import type { TimeRange } from '@kbn/es-query';

async function navigate({
  configId,
  locationId,
  spaceId,
  timeRange,
  tabId,
}: {
  configId: string;
  locationId?: string;
  spaceId?: string;
  timeRange?: TimeRange;
  tabId?: string;
}) {
  let queryParam = locationId ? `?locationId=${locationId}` : '';
  const tab = `${tabId ? `/${tabId}` : ''}`;

  if (spaceId) {
    queryParam += queryParam ? `&spaceId=${spaceId}` : `?spaceId=${spaceId}`;
  }

  if (timeRange) {
    queryParam += queryParam
      ? `&dateRangeStart=${timeRange.from}&dateRangeEnd=${timeRange.to}`
      : `?dateRangeStart=${timeRange.from}&dateRangeEnd=${timeRange.to}`;
  }

  return {
    app: 'synthetics',
    path: `/monitor/${configId}${tab}${queryParam}`,
    state: {},
  };
}

export const monitorDetailNavigatorParams = {
  id: syntheticsMonitorDetailLocatorID,
  getLocation: navigate,
};
