/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { OBSERVABILITY_NIGHTSHIFT_SANDBOX_ALLOWLIST } from '@kbn/management-settings-ids';
import {
  validateSandboxAllowlist,
  type GetSandboxAllowlistResponse,
  type PutSandboxAllowlistRequest,
  type PutSandboxAllowlistResponse,
} from '../../common/sandbox_allowlist';
import { SandboxAllowlistValidationError } from './errors';

/** The `nightshift.enabled` flag is checked by the routes, from the request handler context. */
export interface SandboxAllowlistClient {
  get: (request: KibanaRequest) => Promise<GetSandboxAllowlistResponse>;
  replace: (
    request: KibanaRequest,
    params: PutSandboxAllowlistRequest
  ) => Promise<PutSandboxAllowlistResponse>;
  /**
   * The hosts that may receive real credential values for a sandbox command in the request's
   * space. Server-side only: never exposed to the sandbox or the agent.
   */
  getHostsForCommand: (request: KibanaRequest) => Promise<string[]>;
}

export interface SandboxAllowlistClientDeps {
  savedObjects?: CoreStart['savedObjects'];
  uiSettings?: CoreStart['uiSettings'];
}

/**
 * Creates the client for the per-space sandbox credential host allowlist, stored in the
 * `observability:nightshiftSandboxAllowlist` advanced setting.
 */
export const createSandboxAllowlistClient = ({
  getDeps,
}: {
  getDeps: () => SandboxAllowlistClientDeps;
}): SandboxAllowlistClient => {
  // Writes are authorized by the Nightshift manage privilege on the route, and command-time reads
  // happen on behalf of whoever runs the sandbox tool, so the security extension is skipped. The
  // spaces extension still scopes the settings to the request's space.
  const getUiSettingsClient = (request: KibanaRequest): IUiSettingsClient => {
    const { savedObjects, uiSettings } = getDeps();
    if (!savedObjects || !uiSettings) {
      throw new Error('uiSettings is not available — plugin start() has not been called');
    }
    return uiSettings.asScopedToClient(
      savedObjects.getScopedClient(request, { excludedExtensions: [SECURITY_EXTENSION_ID] })
    );
  };

  const readHosts = async (request: KibanaRequest): Promise<string[]> =>
    (await getUiSettingsClient(request).get<string[]>(
      OBSERVABILITY_NIGHTSHIFT_SANDBOX_ALLOWLIST
    )) ?? [];

  return {
    get: async (request) => ({ hosts: await readHosts(request) }),

    replace: async (request, params) => {
      const { hosts, errors } = validateSandboxAllowlist(params.hosts);
      if (errors.length > 0) {
        throw new SandboxAllowlistValidationError(errors.join('; '));
      }
      await getUiSettingsClient(request).set(OBSERVABILITY_NIGHTSHIFT_SANDBOX_ALLOWLIST, hosts);
      return { hosts };
    },

    getHostsForCommand: async (request) => {
      // Re-validate on read so an overridden or legacy value can never widen the proxy's scope
      // (an empty string or "*" would mean "any host" to the proxy).
      const { hosts, errors } = validateSandboxAllowlist(await readHosts(request));
      return errors.length > 0 ? [] : hosts;
    },
  };
};
