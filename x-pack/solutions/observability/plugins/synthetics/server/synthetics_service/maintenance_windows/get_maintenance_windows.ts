/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SyntheticsServerSetup } from '../../types';

export const getMaintenanceWindows = async (server: SyntheticsServerSetup, spaceId: string) => {
  const maintenanceWindowClient = server.getMaintenanceWindowClientInternal({} as KibanaRequest);

  if (!maintenanceWindowClient) {
    return [];
  }

  const mws = await maintenanceWindowClient.find({
    page: 0,
    perPage: 1000,
    namespaces: [spaceId],
  });
  return mws.data;
};
