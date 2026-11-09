/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  validateSandboxAllowlist,
  type GetSandboxAllowlistResponse,
  type PutSandboxAllowlistRequest,
  type PutSandboxAllowlistResponse,
} from '../../common/sandbox_allowlist';
import {
  NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID,
  NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
  type NightshiftSandboxAllowlistAttributes,
} from '../saved_objects';
import { SandboxAllowlistDisabledError, SandboxAllowlistValidationError } from './errors';

export interface SandboxAllowlistClient {
  /** Reads the space's sandbox egress allowlist. */
  get: (request: KibanaRequest) => Promise<GetSandboxAllowlistResponse>;
  /** Validates, normalizes and stores the space's sandbox egress allowlist. */
  replace: (
    request: KibanaRequest,
    params: PutSandboxAllowlistRequest
  ) => Promise<PutSandboxAllowlistResponse>;
  /**
   * Normalized egress firewall rules for the request's space, for passing to `sandbox-api`.
   * Throws {@link SandboxAllowlistValidationError} if the stored object fails validation.
   */
  getHostsForCommand: (request: KibanaRequest) => Promise<string[]>;
}

export interface SandboxAllowlistClientDeps {
  savedObjects?: CoreStart['savedObjects'];
  spaces?: SpacesPluginStart;
}

/**
 * Client for the per-space sandbox egress firewall allowlist, backed by a hidden space-scoped
 * Saved Object (`nightshift-sandbox-allowlist`) so it can only be modified through the
 * Nightshift `manage`-privileged route (and not through generic `uiSettings` / Saved Objects APIs).
 */
export const createSandboxAllowlistClient = ({
  getDeps,
}: {
  getDeps: () => SandboxAllowlistClientDeps;
}): SandboxAllowlistClient => {
  const getSpaceId = (request: KibanaRequest): string =>
    getDeps().spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

  const getSavedObjectsClient = (request: KibanaRequest) => {
    const { savedObjects } = getDeps();
    if (!savedObjects) {
      throw new SandboxAllowlistDisabledError();
    }
    return savedObjects
      .getScopedClient(request, {
        excludedExtensions: [SECURITY_EXTENSION_ID],
        includedHiddenTypes: [NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE],
      })
      .asScopedToNamespace(getSpaceId(request));
  };

  const readHosts = async (request: KibanaRequest): Promise<string[]> => {
    try {
      const existing = await getSavedObjectsClient(
        request
      ).get<NightshiftSandboxAllowlistAttributes>(
        NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
        NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID
      );
      const raw = existing.attributes.hosts;
      if (!Array.isArray(raw) || !raw.every((item): item is string => typeof item === 'string')) {
        throw new SandboxAllowlistValidationError('Stored sandbox allowlist is malformed');
      }
      return raw;
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return [];
      }
      throw err;
    }
  };

  return {
    get: async (request) => {
      const { hosts } = validateSandboxAllowlist(await readHosts(request));
      return { hosts };
    },

    replace: async (request, { hosts: rawHosts }) => {
      const client = getSavedObjectsClient(request);
      const { hosts, errors } = validateSandboxAllowlist(rawHosts);
      if (errors.length > 0) {
        throw new SandboxAllowlistValidationError(errors.join('; '));
      }
      await client.create<NightshiftSandboxAllowlistAttributes>(
        NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
        { hosts },
        { id: NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID, overwrite: true }
      );
      return { hosts };
    },

    getHostsForCommand: async (request) => {
      // Re-validate on read so a corrupted stored value fails closed instead of silently
      // dropping the space's firewall policy.
      const { hosts, errors } = validateSandboxAllowlist(await readHosts(request));
      if (errors.length > 0) {
        throw new SandboxAllowlistValidationError(errors.join('; '));
      }
      return hosts;
    },
  };
};
