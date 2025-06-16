/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syntheticsMonitorLocationQueryLocatorID } from '@kbn/observability-plugin/common';

async function navigate({ locationId }: { locationId: string }) {
  const locations = encodeURIComponent(JSON.stringify([locationId]));

  return {
    app: 'synthetics',
    path: `?locations=${[locations]}`,
    state: {},
  };
}

export const monitorLocationNavigatorParams = {
  id: syntheticsMonitorLocationQueryLocatorID,
  getLocation: navigate,
};
