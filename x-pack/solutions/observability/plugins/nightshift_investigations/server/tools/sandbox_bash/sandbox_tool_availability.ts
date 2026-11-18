/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { FeatureFlagsStart, KibanaRequest } from '@kbn/core/server';
import type { ToolAvailabilityConfig, ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  isNightshiftSupportedSpace,
  NIGHTSHIFT_API_PRIVILEGES,
  NIGHTSHIFT_ENABLED_FLAG,
  NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE,
} from '@kbn/nightshift-shared';

const unavailable = (reason: string): ToolAvailabilityResult => ({ status: 'unavailable', reason });

/**
 * Whether the user behind a request may use the sandbox: the request targets the space Nightshift
 * runs in, Nightshift is enabled and, when privileges apply, the user holds the Nightshift manage
 * privilege in that space. The sandbox tools and everything else that reads a workspace on a
 * user's behalf go through this one check. The space is part of it because these tools are
 * registered deployment-wide: without it, a manage grant in a space Nightshift was never set up
 * in would still buy a sandbox shell there.
 */
export const checkSandboxAccess = async ({
  request,
  spaceId,
  featureFlags,
  security,
}: {
  request: KibanaRequest;
  spaceId: string;
  featureFlags?: FeatureFlagsStart;
  security?: SecurityPluginStart;
}): Promise<ToolAvailabilityResult> => {
  if (!isNightshiftSupportedSpace(spaceId)) {
    return unavailable(NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE);
  }
  if (
    !featureFlags ||
    !(await firstValueFrom(featureFlags.getBooleanValue$(NIGHTSHIFT_ENABLED_FLAG, false)))
  ) {
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
    : unavailable('Nightshift tools require the nightshift manage privilege in this space.');
};

/** How long one request reuses its access result; bounds how late a privilege change applies. */
export const SANDBOX_ACCESS_CACHE_TTL_MS = 60_000;

interface CachedAccess {
  result: Promise<ToolAvailabilityResult>;
  expiresAt: number;
}

/**
 * Hides a sandbox tool from agents, and blocks running it, unless {@link checkSandboxAccess}
 * allows the request. Agent Builder checks each tool's availability separately and drops a tool
 * whose check takes over 2s, so tools sharing this config reuse one check per request and space
 * instead of each running its own privilege call on every tool listing.
 */
export const createSandboxToolAvailability = ({
  getDeps,
  now = Date.now,
}: {
  getDeps: () => { featureFlags?: FeatureFlagsStart; security?: SecurityPluginStart };
  now?: () => number;
}): ToolAvailabilityConfig => {
  const cache = new WeakMap<KibanaRequest, Map<string, CachedAccess>>();
  return {
    cacheMode: 'none',
    handler: ({ request, spaceId }) => {
      const bySpace = cache.get(request) ?? new Map<string, CachedAccess>();
      cache.set(request, bySpace);
      const cached = bySpace.get(spaceId);
      if (cached && cached.expiresAt > now()) {
        return cached.result;
      }
      const result = checkSandboxAccess({ request, spaceId, ...getDeps() });
      bySpace.set(spaceId, { result, expiresAt: now() + SANDBOX_ACCESS_CACHE_TTL_MS });
      result.catch(() => bySpace.delete(spaceId));
      return result;
    },
  };
};
