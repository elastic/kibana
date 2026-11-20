/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES } from '@kbn/nightshift-shared';

/**
 * The limits apply to the whole deployment, so changing them takes the manage and configure
 * privileges in all spaces, not only in the current one. Denies when privileges cannot be verified.
 */
export const canManageInvestigationQuotas = async ({
  request,
  security,
}: {
  request: KibanaRequest;
  security?: SecurityPluginStart;
}): Promise<boolean> => {
  const authz = security?.authz;
  if (!authz) {
    return false;
  }

  const result = await authz.checkPrivilegesWithRequest(request).globally({
    kibana: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES.map((privilege) =>
      authz.actions.api.get(privilege)
    ),
  });
  return result.hasAllRequested;
};

export const assertCanManageInvestigationQuotas = async (params: {
  request: KibanaRequest;
  security?: SecurityPluginStart;
}): Promise<void> => {
  if (!(await canManageInvestigationQuotas(params))) {
    throw forbidden(
      'Managing investigation limits requires nightshift manage and nightshift configure in all spaces'
    );
  }
};
