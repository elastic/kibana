/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { SignificantEventsServer } from '../../types';

interface PrivilegeCheckParams {
  request: KibanaRequest;
  server: Pick<SignificantEventsServer, 'security'>;
}

const hasNightshiftApiPrivilege = async ({
  request,
  server,
  privilege,
}: PrivilegeCheckParams & { privilege: string }): Promise<boolean> => {
  const authz = server.security.authz;
  if (!authz) {
    return false;
  }

  const result = await authz.checkPrivilegesDynamicallyWithRequest(request)({
    kibana: [authz.actions.api.get(privilege)],
  });
  return result.hasAllRequested;
};

export const assertCanManageSignificantEvents = async (
  params: PrivilegeCheckParams
): Promise<void> => {
  if (
    !(await hasNightshiftApiPrivilege({ ...params, privilege: NIGHTSHIFT_API_PRIVILEGES.manage }))
  ) {
    throw Boom.forbidden('Managing significant events requires the Nightshift manage privilege');
  }
};

/** Whether the request holds `read_nightshift`, for paths that degrade instead of failing (attachments). */
export const canReadSignificantEvents = (params: PrivilegeCheckParams): Promise<boolean> =>
  hasNightshiftApiPrivilege({ ...params, privilege: NIGHTSHIFT_API_PRIVILEGES.read });

/** Gates non-route reads (Agent Builder tools) the way `read_nightshift` gates routes. */
export const assertCanReadSignificantEvents = async (
  params: PrivilegeCheckParams
): Promise<void> => {
  if (!(await canReadSignificantEvents(params))) {
    throw Boom.forbidden('Reading significant events requires the Nightshift read privilege');
  }
};
