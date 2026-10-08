/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import type { SpaceId } from '@kbn/core-spaces-common';
import { NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { SignificantEventsServer } from '../../types';

/**
 * Reset acts on every space, but the route's privilege check only covers the space of the
 * request. A caller who can manage one space must not be able to pause, sweep and reconfigure
 * the others, so every space has to grant the same privileges the route requires. Runs before
 * anything is written. Without RBAC (security disabled) there is nothing to check.
 */
export const assertCanManageAllSpaces = async ({
  server,
  request,
  spaceIds,
}: {
  server: SignificantEventsServer;
  request: KibanaRequest;
  spaceIds: SpaceId[];
}): Promise<void> => {
  const { authz } = server.security;
  if (!authz.mode.useRbacForRequest(request)) {
    return;
  }

  const { privileges } = await authz.checkPrivilegesWithRequest(request).atSpaces(spaceIds, {
    kibana: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES.map((privilege) =>
      authz.actions.api.get(privilege)
    ),
  });

  const deniedSpaceIds = [
    ...new Set(
      privileges.kibana
        .filter(({ authorized }) => !authorized)
        .flatMap(({ resource }) => (resource === undefined ? [] : [resource]))
    ),
  ];
  if (deniedSpaceIds.length > 0) {
    throw forbidden(
      `Reset applies to every space and requires the Nightshift manage and configure privileges in all of them. Missing in: ${deniedSpaceIds
        .map((spaceId) => `"${spaceId}"`)
        .join(', ')}.`
    );
  }
};
