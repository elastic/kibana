/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { PRIVATE_LOCATION_WRITE_API } from '../../feature';
import type { SyntheticsServerSetup } from '../../types';
import type { SyntheticsRestApiRouteFactory } from '../types';

export interface ClusterSettingsPrivileges {
  canManage: boolean;
}

/**
 * Cluster-wide settings (sync interval, shard rebalancing) affect private
 * locations in every space, so a user must be able to manage private
 * locations in all spaces, not just the current one.
 */
export const canManageClusterSettings = async (
  server: Pick<SyntheticsServerSetup, 'security'>,
  request: KibanaRequest
): Promise<boolean> => {
  const { authz } = server.security;
  if (!authz.mode.useRbacForRequest(request)) {
    return true;
  }
  const { hasAllRequested } = await authz
    .checkPrivilegesWithRequest(request)
    .globally({ kibana: [authz.actions.api.get(PRIVATE_LOCATION_WRITE_API)] });
  return hasAllRequested;
};

export const getClusterSettingsPrivilegesRoute: SyntheticsRestApiRouteFactory<
  ClusterSettingsPrivileges
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.CLUSTER_SETTINGS_PRIVILEGES,
  validate: false,
  handler: async ({ server, request }) => ({
    canManage: await canManageClusterSettings(server, request),
  }),
});
