/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';

/**
 * The API privileges required to build the default ES|QL query. These match the
 * `requiredPrivileges` of the `/internal/attack_discovery/attack_discovery/queries/esql/default`
 * route, so the Agent Builder tool is no more permissive than the HTTP route.
 */
export const DEFAULT_ESQL_QUERY_REQUIRED_API_PRIVILEGES = [
  ATTACK_DISCOVERY_API_ACTION_ALL,
  ALERTS_API_READ,
] as const;

/**
 * Returns `true` when the principal behind `request` holds ALL of
 * `DEFAULT_ESQL_QUERY_REQUIRED_API_PRIVILEGES` in `spaceId`.
 */
export const isAuthorizedToBuildDefaultQuery = async ({
  authz,
  request,
  spaceId,
}: {
  authz: SecurityPluginStart['authz'];
  request: KibanaRequest;
  spaceId: string;
}): Promise<boolean> => {
  const { hasAllRequested } = await authz.checkPrivilegesWithRequest(request).atSpace(spaceId, {
    kibana: DEFAULT_ESQL_QUERY_REQUIRED_API_PRIVILEGES.map((privilege) =>
      authz.actions.api.get(privilege)
    ),
  });

  return hasAllRequested;
};
