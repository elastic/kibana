/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { getFleetSecretStorageEnabled } from '../../../synthetics_service/fleet_secret_storage';
import { listConnections } from './connection_utils';

/** GET: secret-storage status + whether this space has any Vault connections. */
export const getFleetSecretStorageStatusRoute: SyntheticsRestApiRouteFactory<{
  secretStorageEnabled: boolean;
  hasSecretConnections: boolean;
}> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.FLEET_SECRET_STORAGE_STATUS,
  validate: {},
  handler: async (routeContext) => {
    const [secretStorageEnabled, connections] = await Promise.all([
      getFleetSecretStorageEnabled(routeContext.server, true),
      listConnections(routeContext),
    ]);
    return { secretStorageEnabled, hasSecretConnections: connections.length > 0 };
  },
});
