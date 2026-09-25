/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { NIGHTSHIFT_API_PRIVILEGES, NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import type {
  GetSandboxSecretsResponse,
  PutSandboxSecretsRequest,
  PutSandboxSecretsResponse,
} from '../../common/sandbox_secrets';
import {
  MAX_SANDBOX_SECRETS,
  validateSandboxSecretKey,
  validateSandboxSecretValue,
} from '../../common/sandbox_secrets';
import { NIGHTSHIFT_SECRETS_SO_TYPE, type NightshiftSecretsAttributes } from '../saved_objects';
import {
  SandboxSecretsConflictError,
  SandboxSecretsDisabledError,
  SandboxSecretsUnavailableError,
  SandboxSecretsValidationError,
} from './errors';

export interface SandboxSecretsEnv {
  env: Record<string, string>;
  /** Secret values that must be redacted from command output before it leaves Kibana. */
  secretValues: string[];
}

export type SandboxSecretsResolution = SandboxSecretsEnv | { errorMessage: string };

export interface SandboxSecretsClient {
  /** Throws {@link SandboxSecretsDisabledError} unless the `nightshift.enabled` flag is on. */
  listKeys: (request: KibanaRequest) => Promise<GetSandboxSecretsResponse>;
  /** Throws {@link SandboxSecretsDisabledError} unless the `nightshift.enabled` flag is on. */
  replaceEntries: (
    request: KibanaRequest,
    params: PutSandboxSecretsRequest
  ) => Promise<PutSandboxSecretsResponse>;
  /** Keys a sandbox tool call may request; empty when the user may not use sandbox secrets. */
  listKeysForSandbox: (request: KibanaRequest) => Promise<string[]>;
  resolveForCommand: (
    request: KibanaRequest,
    requestedKeys: readonly string[]
  ) => Promise<SandboxSecretsResolution>;
  /**
   * Every stored value of the request's space, for redacting sandbox output. Not privilege-gated:
   * the values must never leave Kibana. Throws when stored values exist but cannot be decrypted.
   */
  getRedactionValues: (request: KibanaRequest) => Promise<string[]>;
}

export interface SandboxSecretsClientDeps {
  featureFlags?: CoreStart['featureFlags'];
  savedObjects?: CoreStart['savedObjects'];
  encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

const validateEntries = ({ entries }: PutSandboxSecretsRequest): void => {
  if (entries.length > MAX_SANDBOX_SECRETS) {
    throw new SandboxSecretsValidationError(`At most ${MAX_SANDBOX_SECRETS} secrets are allowed`);
  }
  const seen = new Set<string>();
  for (const { key, value } of entries) {
    const keyError = validateSandboxSecretKey(key);
    if (keyError) {
      throw new SandboxSecretsValidationError(`Secret key '${key}' ${keyError}`);
    }
    const valueError = value !== undefined ? validateSandboxSecretValue(value) : undefined;
    if (valueError) {
      throw new SandboxSecretsValidationError(`Secret '${key}' ${valueError}`);
    }
    if (seen.has(key)) {
      throw new SandboxSecretsValidationError(`Secret key '${key}' is listed more than once`);
    }
    seen.add(key);
  }
};

/**
 * Creates the client for the per-space sandbox secrets object. Values are only ever decrypted as
 * the internal user and never returned to callers other than the sandbox command resolver, which
 * only serves users with the Nightshift read privilege, and the sandbox output redaction.
 */
export const createSandboxSecretsClient = ({
  getDeps,
  canEncrypt,
  logger,
}: {
  getDeps: () => SandboxSecretsClientDeps;
  canEncrypt: boolean;
  logger: Logger;
}): SandboxSecretsClient => {
  const getSpaceId = (request: KibanaRequest): string =>
    getDeps().spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

  // Access is authorized by the route privileges and `getSandboxAccessDeniedReason`, so the
  // security extension is skipped; the encryption extension stays enabled so `values` is
  // encrypted on write.
  const getSavedObjectsClient = (request: KibanaRequest) => {
    const { savedObjects } = getDeps();
    if (!savedObjects) {
      throw new Error('savedObjects is not available — plugin start() has not been called');
    }
    return savedObjects
      .getScopedClient(request, {
        excludedExtensions: [SECURITY_EXTENSION_ID],
        includedHiddenTypes: [NIGHTSHIFT_SECRETS_SO_TYPE],
      })
      .asScopedToNamespace(getSpaceId(request));
  };

  // A space is expected to hold a single secrets object; the oldest one wins if a race created more.
  const findSecretsObject = async (
    request: KibanaRequest
  ): Promise<SavedObject<NightshiftSecretsAttributes> | undefined> => {
    const { saved_objects: savedObjects } = await getSavedObjectsClient(
      request
    ).find<NightshiftSecretsAttributes>({
      type: NIGHTSHIFT_SECRETS_SO_TYPE,
      perPage: 1,
      sortField: 'created_at',
      sortOrder: 'asc',
    });
    return savedObjects[0];
  };

  const readDecryptedValues = async (request: KibanaRequest, id: string | undefined) => {
    const { encryptedSavedObjects } = getDeps();
    if (!canEncrypt || !encryptedSavedObjects) {
      throw new SandboxSecretsUnavailableError();
    }
    if (!id) {
      return {};
    }
    try {
      const { attributes } = await encryptedSavedObjects
        .getClient({ includedHiddenTypes: [NIGHTSHIFT_SECRETS_SO_TYPE] })
        .getDecryptedAsInternalUser<NightshiftSecretsAttributes>(NIGHTSHIFT_SECRETS_SO_TYPE, id, {
          namespace: SavedObjectsUtils.namespaceStringToId(getSpaceId(request)),
        });
      return attributes.values ?? {};
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return {};
      }
      throw err;
    }
  };

  // Injecting a command's env and building the output redactor both need every stored value for
  // the request's space, and both happen for the same sandbox tool call. Keyed by the
  // KibanaRequest instance so the decrypted values are fetched at most once per call and cannot
  // outlive it: nothing here keeps a reference to the request once it is done.
  const decryptedValuesByRequest = new WeakMap<KibanaRequest, Promise<Record<string, string>>>();
  const getDecryptedValuesForRequest = (
    request: KibanaRequest
  ): Promise<Record<string, string>> => {
    const cached = decryptedValuesByRequest.get(request);
    if (cached) {
      return cached;
    }
    const promise = (async () => {
      const existing = await findSecretsObject(request);
      return existing ? readDecryptedValues(request, existing.id) : {};
    })();
    decryptedValuesByRequest.set(request, promise);
    return promise;
  };

  const isNightshiftEnabled = async (): Promise<boolean> =>
    (await getDeps().featureFlags?.getBooleanValue(NIGHTSHIFT_ENABLED_FLAG, false)) ?? false;

  const assertNightshiftEnabled = async (): Promise<void> => {
    if (!(await isNightshiftEnabled())) {
      throw new SandboxSecretsDisabledError();
    }
  };

  // Deny by default: without the security plugin the user's privileges cannot be verified.
  const getSandboxAccessDeniedReason = async (
    request: KibanaRequest
  ): Promise<string | undefined> => {
    if (!(await isNightshiftEnabled())) {
      return new SandboxSecretsDisabledError().message;
    }
    const { security } = getDeps();
    if (!security) {
      return 'Sandbox secrets are unavailable: the security plugin is not available.';
    }
    const { authz } = security;
    if (!authz.mode.useRbacForRequest(request)) {
      return undefined;
    }
    const { hasAllRequested } = await authz.checkPrivilegesDynamicallyWithRequest(request)({
      kibana: [authz.actions.api.get(NIGHTSHIFT_API_PRIVILEGES.read)],
    });
    return hasAllRequested
      ? undefined
      : 'Sandbox secrets require the Nightshift read privilege in this space.';
  };

  return {
    listKeys: async (request) => {
      await assertNightshiftEnabled();
      const existing = await findSecretsObject(request);
      if (!existing) {
        return { keys: [], canEncrypt };
      }
      return { keys: existing.attributes.keys ?? [], version: existing.version, canEncrypt };
    },

    replaceEntries: async (request, params) => {
      await assertNightshiftEnabled();
      validateEntries(params);

      const existing = await findSecretsObject(request);
      let existingValues: Record<string, string>;
      try {
        existingValues = await readDecryptedValues(request, existing?.id);
      } catch (err) {
        if (err instanceof SandboxSecretsUnavailableError) throw err;
        if (!getDeps().encryptedSavedObjects?.isEncryptionError(err)) throw err;
        // The stored object can no longer be decrypted (e.g. rotated key): every value must be re-entered.
        logger.warn(`Stored sandbox secrets could not be decrypted: ${err.message}`);
        existingValues = {};
      }

      const values: Record<string, string> = {};
      for (const { key, value } of params.entries) {
        const resolvedValue = value ?? existingValues[key];
        if (resolvedValue === undefined) {
          throw new SandboxSecretsValidationError(`Secret '${key}' needs a value`);
        }
        values[key] = resolvedValue;
      }
      const keys = params.entries.map(({ key }) => key);

      try {
        const saved = await getSavedObjectsClient(request).create<NightshiftSecretsAttributes>(
          NIGHTSHIFT_SECRETS_SO_TYPE,
          { keys, values },
          existing ? { id: existing.id, overwrite: true, version: params.version } : undefined
        );
        return { keys, version: saved.version };
      } catch (err) {
        if (SavedObjectsErrorHelpers.isConflictError(err)) {
          throw new SandboxSecretsConflictError();
        }
        throw err;
      }
    },

    listKeysForSandbox: async (request) => {
      if (await getSandboxAccessDeniedReason(request)) {
        return [];
      }
      const existing = await findSecretsObject(request);
      return existing?.attributes.keys ?? [];
    },

    resolveForCommand: async (request, requestedKeys) => {
      let values: Record<string, string>;
      try {
        const deniedReason = await getSandboxAccessDeniedReason(request);
        if (deniedReason) {
          logger.warn(`Refused sandbox secrets: ${deniedReason}`);
          return { errorMessage: deniedReason };
        }
        values = await getDecryptedValuesForRequest(request);
      } catch (err) {
        return { errorMessage: `Failed to load sandbox secrets: ${err.message}` };
      }

      const missing = requestedKeys.filter((key) => !Object.hasOwn(values, key));
      if (missing.length > 0) {
        return {
          errorMessage:
            `Unknown sandbox secret(s): ${missing.join(', ')}. ` +
            `Available secrets: ${Object.keys(values).join(', ') || 'none'}. ` +
            `Check /workspace/connectors.md.`,
        };
      }

      const env: Record<string, string> = {};
      for (const key of requestedKeys) {
        env[key] = values[key];
      }
      logger.debug(`Injecting ${requestedKeys.length} sandbox secret(s) into a single command`);
      return { env, secretValues: Object.values(env) };
    },

    // Shares the decrypt with resolveForCommand for the same request/tool call (see
    // getDecryptedValuesForRequest); not cached beyond that single request.
    getRedactionValues: async (request) =>
      Object.values(await getDecryptedValuesForRequest(request)),
  };
};
