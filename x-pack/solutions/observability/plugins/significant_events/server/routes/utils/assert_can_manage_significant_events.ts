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

export const assertCanManageSignificantEvents = async ({
  request,
  server,
}: {
  request: KibanaRequest;
  server: SignificantEventsServer;
}): Promise<void> => {
  const authz = server.security.authz;
  if (!authz) {
    throw Boom.forbidden('Managing significant events requires the Nightshift manage privilege');
  }

  const result = await authz.checkPrivilegesDynamicallyWithRequest(request)({
    kibana: [authz.actions.api.get(NIGHTSHIFT_API_PRIVILEGES.manage)],
  });
  if (!result.hasAllRequested) {
    throw Boom.forbidden('Managing significant events requires the Nightshift manage privilege');
  }
};
