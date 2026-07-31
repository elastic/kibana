/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import type {
  SyntheticsVaultConnection,
  VaultConnectionStatus,
} from '../../../../common/runtime_types';
import { syntheticsVaultConnectionType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { VAULT_CONNECTION_SO_ID } from '../../../saved_objects/synthetics_vault_connection';

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
      const { address, namespace, authMethod, roleId, kvMount, tlsSkipVerify } = so.attributes;
      return {
        configured: true,
        address,
        namespace,
        authMethod,
        roleId,
        kvMount,
        tlsSkipVerify,
        // A configured connection always has a stored secret; the value itself
        // is never read back here.
        hasSecret: true,
      };
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
  token: schema.maybe(schema.string()),
  roleId: schema.maybe(schema.string()),
  secretId: schema.maybe(schema.string()),
});

/**
 * Creates or updates the single Vault connection for the active space. Secrets
 * left blank are preserved from the existing connection so a user can edit
 * non-secret fields without re-entering credentials.
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
      token: body.token || existing?.token,
      roleId: body.roleId,
      secretId: body.secretId || existing?.secretId,
    };

    await savedObjectsClient.create<SyntheticsVaultConnection>(
      syntheticsVaultConnectionType,
      attributes,
      { id: VAULT_CONNECTION_SO_ID, overwrite: true, initialNamespaces: [spaceId] }
    );

    const hasSecret = Boolean(body.authMethod === 'token' ? attributes.token : attributes.secretId);

    return {
      configured: true,
      address: attributes.address,
      namespace: attributes.namespace,
      authMethod: attributes.authMethod,
      roleId: attributes.roleId,
      kvMount: attributes.kvMount,
      tlsSkipVerify: attributes.tlsSkipVerify,
      hasSecret,
    };
  },
});
