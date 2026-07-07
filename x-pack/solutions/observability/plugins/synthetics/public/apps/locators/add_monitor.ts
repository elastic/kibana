/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syntheticsAddMonitorLocatorID } from '@kbn/observability-plugin/common';

async function navigate({ spaceId }: { spaceId?: string } = {}) {
  return {
    app: 'synthetics',
    path: `/add-monitor` + (spaceId ? `?spaceId=${spaceId}` : ''),
    state: {},
  };
}

export const addMonitorNavigatorParams = {
  id: syntheticsAddMonitorLocatorID,
  getLocation: navigate,
};
