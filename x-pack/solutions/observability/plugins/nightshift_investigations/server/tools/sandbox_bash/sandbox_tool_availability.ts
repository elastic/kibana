/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import type { ToolAvailabilityConfig, ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { NIGHTSHIFT_API_PRIVILEGES, NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';

const unavailable = (reason: string): ToolAvailabilityResult => ({ status: 'unavailable', reason });

/**
 * Hides a sandbox tool from agents, and blocks running it, unless the `nightshift.enabled` flag is
 * on and the user has the Nightshift manage privilege in the current space. Evaluated per request
 * because the privilege check depends on the user.
 */
export const createSandboxToolAvailability = ({
  getDeps,
}: {
  getDeps: () => { featureFlags?: FeatureFlagsStart; security?: SecurityPluginStart };
}): ToolAvailabilityConfig => ({
  cacheMode: 'none',
  handler: async ({ request }) => {
    const { featureFlags, security } = getDeps();
    if (!(await featureFlags?.getBooleanValue(NIGHTSHIFT_ENABLED_FLAG, false))) {
      return unavailable('Nightshift is not enabled.');
    }
    // Deny by default: without the security plugin the user's privileges cannot be verified.
    if (!security) {
      return unavailable('The security plugin is not available.');
    }
    const { authz } = security;
    if (!authz.mode.useRbacForRequest(request)) {
      return { status: 'available' };
    }
    const { hasAllRequested } = await authz.checkPrivilegesDynamicallyWithRequest(request)({
      kibana: [authz.actions.api.get(NIGHTSHIFT_API_PRIVILEGES.manage)],
    });
    return hasAllRequested
      ? { status: 'available' }
      : unavailable('Sandbox tools require the Nightshift manage privilege in this space.');
  },
});
