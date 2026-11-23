/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import { DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';

/**
 * Whether the user has the manage sessions privilege in every space, as turning sessions off or
 * back on changes them for all. Kibana's role editor and role API only let the sub-feature be
 * granted in all spaces, but a role written to Elasticsearch directly could grant it in one.
 */
export const canManageSessionsInAllSpaces = async (
  authz: AuthorizationServiceSetup | undefined,
  request: KibanaRequest
): Promise<boolean> => {
  // Checked by the route for this space already: without it here, it isn't granted everywhere.
  if (request.authzResult?.[DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions] === false) {
    return false;
  }
  // Without RBAC, routes don't check Kibana privileges either.
  if (!authz || !authz.mode.useRbacForRequest(request)) {
    return true;
  }
  const { hasAllRequested } = await authz.checkPrivilegesWithRequest(request).globally({
    kibana: [authz.actions.api.get(DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions)],
  });
  return hasAllRequested;
};
