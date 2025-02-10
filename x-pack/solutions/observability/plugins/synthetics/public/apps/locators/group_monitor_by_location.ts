/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syntheticsMonitorLocationQueryLocatorID } from '@kbn/observability-plugin/common';

async function navigate({
  monitorId,
  locationId,
  spaceId,
}: {
  monitorId: string;
  locationId?: string;
  spaceId?: string;
}) {
  let queryParam = locationId ? `?locationId=${locationId}` : '';

  if (spaceId) {
    queryParam += queryParam ? `&spaceId=${spaceId}` : `?spaceId=${spaceId}`;
  }

  return {
    app: 'synthetics',
    path: `/monitor/${queryParam}`,
    state: {},
  };
}

export const monitorDetailNavigatorParams = {
  id: syntheticsMonitorLocationQueryLocatorID,
  getLocation: navigate,
};
