/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SyntheticsServerSetup } from '../../../types';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import type {
  SyntheticsVaultConnection,
  VaultConnectionStatus,
} from '../../../../common/runtime_types';
import { syntheticsVaultConnectionType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { VAULT_CONNECTION_SO_ID } from '../../../saved_objects/synthetics_vault_connection';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';

const toStatus = (
  attributes: SyntheticsVaultConnection,
  hasSecret: boolean
): VaultConnectionStatus => ({
  configured: true,
  address: attributes.address,
  namespace: attributes.namespace,
  authMethod: attributes.authMethod,
  roleId: attributes.roleId,
  kvMount: attributes.kvMount,
  tlsSkipVerify: attributes.tlsSkipVerify,
  secretRefreshInterval: attributes.secretRefreshInterval,
  refreshedAt: attributes.refreshedAt,
  hasSecret,
});

// Re-push private-location configs so the updated connection (new refreshedAt =
// new blob) reaches agents, forcing Heartbeat to re-resolve — this is how a
// manual refresh / rotation propagates.
const propagate = (server: SyntheticsServerSetup, spaceId: string) =>
  asyncGlobalParamsPropagation({ server, paramsSpacesToSync: [spaceId] });

/**
 * Returns the current Vault connection as a secret-free status view. The
 * encrypted token / secret_id are never returned to the browser.
 */
export const getVaultConnectionRoute: SyntheticsRestApiRouteFactory<
  VaultConnectionStatus
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.VAULT_CONNECTION,
  validate: {},
  handler: async ({ savedObjectsClient }): Promise<VaultConnectionStatus> => {
    try {
      const so = await savedObjectsClient.get<SyntheticsVaultConnection>(
        syntheticsVaultConnectionType,
        VAULT_CONNECTION_SO_ID
      );
      return toStatus(so.attributes, true);
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return { configured: false };
      }
      throw error;
    }
  },
});

const SaveBodySchema = schema.object({
  address: schema.string({ minLength: 1 }),
  authMethod: schema.oneOf([schema.literal('token'), schema.literal('approle')]),
  namespace: schema.maybe(schema.string()),
  kvMount: schema.maybe(schema.string()),
  tlsSkipVerify: schema.maybe(schema.boolean()),
  secretRefreshInterval: schema.maybe(schema.string()),
  token: schema.maybe(schema.string()),
  roleId: schema.maybe(schema.string()),
  secretId: schema.maybe(schema.string()),
});

/**
 * Creates or updates the single Vault connection for the active space. Secrets
 * left blank are preserved so a user can edit non-secret fields without
 * re-entering credentials. Every save stamps a fresh refreshedAt and re-pushes
 * configs.
 */
export const saveVaultConnectionRoute: SyntheticsRestApiRouteFactory<
  VaultConnectionStatus
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.VAULT_CONNECTION,
  validate: {
    body: SaveBodySchema,
  },
  writeAccess: true,
  handler: async ({ request, response, savedObjectsClient, server, spaceId }) => {
    const body = request.body as SyntheticsVaultConnection;

    if (body.authMethod === 'approle' && !body.roleId) {
      return response.badRequest({ body: { message: 'approle auth requires a role_id' } });
    }

    // Preserve existing secrets when the corresponding field is left blank.
    const encryptedClient = server.encryptedSavedObjects.getClient();
    let existing: SyntheticsVaultConnection | undefined;
    try {
      const decrypted = await encryptedClient.getDecryptedAsInternalUser<SyntheticsVaultConnection>(
        syntheticsVaultConnectionType,
        VAULT_CONNECTION_SO_ID,
        { namespace: spaceId }
      );
      existing = decrypted.attributes;
    } catch (e) {
      existing = undefined;
    }

    const attributes: SyntheticsVaultConnection = {
      address: body.address,
      authMethod: body.authMethod,
      namespace: body.namespace,
      kvMount: body.kvMount,
      tlsSkipVerify: body.tlsSkipVerify,
      secretRefreshInterval: body.secretRefreshInterval,
      refreshedAt: new Date().toISOString(),
      token: body.token || existing?.token,
      roleId: body.roleId,
      secretId: body.secretId || existing?.secretId,
    };

    await savedObjectsClient.create<SyntheticsVaultConnection>(
      syntheticsVaultConnectionType,
      attributes,
      { id: VAULT_CONNECTION_SO_ID, overwrite: true, initialNamespaces: [spaceId] }
    );

    await propagate(server, spaceId);

    const hasSecret = Boolean(body.authMethod === 'token' ? attributes.token : attributes.secretId);
    return toStatus(attributes, hasSecret);
  },
});

/**
 * Manual "Refresh secrets": bumps refreshedAt (which changes the delivered blob)
 * and re-pushes configs so agents re-resolve every vault-backed secret from
 * Vault — picking up rotations without editing the connection.
 */
export const refreshVaultConnectionRoute: SyntheticsRestApiRouteFactory<
  VaultConnectionStatus
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.VAULT_CONNECTION + '/_refresh',
  validate: {},
  writeAccess: true,
  handler: async ({ response, savedObjectsClient, server, spaceId }) => {
    const encryptedClient = server.encryptedSavedObjects.getClient();
    let existing: SyntheticsVaultConnection;
    try {
      const decrypted = await encryptedClient.getDecryptedAsInternalUser<SyntheticsVaultConnection>(
        syntheticsVaultConnectionType,
        VAULT_CONNECTION_SO_ID,
        { namespace: spaceId }
      );
      existing = decrypted.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return response.notFound({ body: { message: 'No Vault connection configured' } });
      }
      throw error;
    }

    const attributes: SyntheticsVaultConnection = {
      ...existing,
      refreshedAt: new Date().toISOString(),
    };

    await savedObjectsClient.create<SyntheticsVaultConnection>(
      syntheticsVaultConnectionType,
      attributes,
      { id: VAULT_CONNECTION_SO_ID, overwrite: true, initialNamespaces: [spaceId] }
    );

    await propagate(server, spaceId);

    const hasSecret = Boolean(existing.authMethod === 'token' ? existing.token : existing.secretId);
    return toStatus(attributes, hasSecret);
  },
});
