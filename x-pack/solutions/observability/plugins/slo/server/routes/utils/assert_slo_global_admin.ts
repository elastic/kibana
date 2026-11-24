/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { SecurityException } from '../../errors';

interface Params {
  authz: SecurityPluginStart['authz'];
  request: KibanaRequest;
}

/** Throws unless the user can write SLOs in all spaces: global SLO settings apply to every space. */
export const assertSloGlobalAdmin = async ({ authz, request }: Params): Promise<void> => {
  if (!authz.mode.useRbacForRequest(request)) {
    return;
  }

  const { hasAllRequested } = await authz
    .checkPrivilegesWithRequest(request)
    .globally({ kibana: [authz.actions.api.get('slo_write')] });

  if (!hasAllRequested) {
    throw new SecurityException(
      'Global SLO settings require the SLO "All" privilege in all spaces'
    );
  }
};
