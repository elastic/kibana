/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SyntheticsServerSetup } from '../../../types';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import type {
  SyntheticsVaultConnection,
  VaultConnectionStatus,
} from '../../../../common/runtime_types';
import { syntheticsVaultConnectionType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { vaultConnectionId } from '../../../saved_objects/synthetics_vault_connection';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';

const toStatus = (attributes: SyntheticsVaultConnection): VaultConnectionStatus => ({
  configured: true,
  name: attributes.name,
  address: attributes.address,
  namespace: attributes.namespace,
  authMethod: attributes.authMethod,
  roleId: attributes.roleId,
  kvMount: attributes.kvMount,
  tlsSkipVerify: attributes.tlsSkipVerify,
  secretRefreshInterval: attributes.secretRefreshInterval,
  refreshedAt: attributes.refreshedAt,
  hasSecret: Boolean(attributes.authMethod === 'token' ? attributes.token : attributes.secretId),
});

// Re-push private-location configs so the updated connections reach agents,
// forcing Heartbeat to re-resolve — how a save/refresh/delete propagates.
const propagate = (server: SyntheticsServerSetup, spaceId: string) =>
  asyncGlobalParamsPropagation({ server, paramsSpacesToSync: [spaceId] });

const listConnections = async ({
  savedObjectsClient,
}: RouteContext): Promise<VaultConnectionStatus[]> => {
  const finder = savedObjectsClient.createPointInTimeFinder<SyntheticsVaultConnection>({
    type: syntheticsVaultConnectionType,
    perPage: 1000,
  });
  const out: VaultConnectionStatus[] = [];
  for await (const result of finder.find()) {
    for (const so of result.saved_objects) {
      out.push(toStatus(so.attributes));
    }
  }
  finder.close().catch(() => {});
  return out;
};

/** GET: list all Vault connections (secret-free). */
export const getVaultConnectionsRoute: SyntheticsRestApiRouteFactory<
  VaultConnectionStatus[]
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.VAULT_CONNECTION,
  validate: {},
  handler: async (routeContext) => listConnections(routeContext),
});

const SaveBodySchema = schema.object({
  name: schema.string({ minLength: 1 }),
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

/** PUT: create or update a connection (keyed by name). Blank secrets are kept. */
export const saveVaultConnectionRoute: SyntheticsRestApiRouteFactory<
  VaultConnectionStatus
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.VAULT_CONNECTION,
  validate: { body: SaveBodySchema },
  writeAccess: true,
  handler: async ({ request, response, savedObjectsClient, server, spaceId }) => {
    const body = request.body as SyntheticsVaultConnection;
    if (body.authMethod === 'approle' && !body.roleId) {
      return response.badRequest({ body: { message: 'approle auth requires a role_id' } });
    }

    const id = vaultConnectionId(body.name);
    const encryptedClient = server.encryptedSavedObjects.getClient();
    let existing: SyntheticsVaultConnection | undefined;
    try {
      const decrypted = await encryptedClient.getDecryptedAsInternalUser<SyntheticsVaultConnection>(
        syntheticsVaultConnectionType,
        id,
        { namespace: spaceId }
      );
      existing = decrypted.attributes;
    } catch (e) {
      existing = undefined;
    }

    const attributes: SyntheticsVaultConnection = {
      name: body.name,
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
      { id, overwrite: true, initialNamespaces: [spaceId] }
    );
    await propagate(server, spaceId);
    return toStatus(attributes);
  },
});

/** DELETE /{name}: remove a connection. */
export const deleteVaultConnectionRoute: SyntheticsRestApiRouteFactory<
  { deleted: boolean },
  { name: string }
> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.VAULT_CONNECTION + '/{name}',
  validate: { params: schema.object({ name: schema.string() }) },
  writeAccess: true,
  handler: async ({ request, savedObjectsClient, server, spaceId }) => {
    const { name } = request.params as { name: string };
    await savedObjectsClient.delete(syntheticsVaultConnectionType, vaultConnectionId(name));
    await propagate(server, spaceId);
    return { deleted: true };
  },
});

/**
 * POST /_refresh: bump refreshedAt on every connection (which changes the blob)
 * and re-push configs, so agents re-resolve all vault-backed secrets.
 */
export const refreshVaultConnectionsRoute: SyntheticsRestApiRouteFactory<
  VaultConnectionStatus[]
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.VAULT_CONNECTION + '/_refresh',
  validate: {},
  writeAccess: true,
  handler: async (routeContext) => {
    const { savedObjectsClient, server, spaceId } = routeContext;
    const encryptedClient = server.encryptedSavedObjects.getClient();
    const finder =
      await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsVaultConnection>(
        { type: syntheticsVaultConnectionType, perPage: 1000, namespaces: [spaceId] }
      );

    const refreshedAt = new Date().toISOString();
    for await (const result of finder.find()) {
      for (const so of result.saved_objects) {
        if (!so.attributes) continue;
        await savedObjectsClient.create<SyntheticsVaultConnection>(
          syntheticsVaultConnectionType,
          { ...so.attributes, refreshedAt },
          { id: so.id, overwrite: true, initialNamespaces: [spaceId] }
        );
      }
    }
    finder.close().catch(() => {});

    await propagate(server, spaceId);
    return listConnections(routeContext);
  },
});
