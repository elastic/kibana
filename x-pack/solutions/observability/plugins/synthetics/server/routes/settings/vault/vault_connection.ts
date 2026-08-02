/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { SyntheticsServerSetup } from '../../../types';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import type {
  SecretProviderType,
  SyntheticsVaultConnection,
  VaultConnectionStatus,
} from '../../../../common/runtime_types';
import { SECRET_PROVIDER_HASHICORP_VAULT } from '../../../../common/runtime_types';
import { syntheticsVaultConnectionType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { vaultConnectionId } from '../../../saved_objects/synthetics_vault_connection';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';

// Whether the connection has its provider secret stored, so the UI can render
// "•••• saved" without receiving the value. Per-provider: HashiCorp Vault stores a
// token (token auth) or a secret_id (approle).
const hasStoredSecret = (a: SyntheticsVaultConnection): boolean => {
  const secrets = a.secrets ?? {};
  return a.config.authMethod === 'token' ? Boolean(secrets.token) : Boolean(secrets.secretId);
};

const toStatus = (attributes: SyntheticsVaultConnection): VaultConnectionStatus => ({
  configured: true,
  name: attributes.name,
  type: attributes.type,
  secretRefreshInterval: attributes.secretRefreshInterval,
  refreshedAt: attributes.refreshedAt,
  // Non-secret provider config, returned verbatim.
  config: attributes.config,
  hasSecret: hasStoredSecret(attributes),
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

// HashiCorp Vault provider request shapes. Adding a provider means adding its
// config/secrets schema and turning `type`/`config`/`secrets` into a discriminated
// `schema.oneOf` keyed on `type`.
const HashiCorpVaultConfigSchema = schema.object({
  address: schema.string({ minLength: 1 }),
  authMethod: schema.oneOf([schema.literal('token'), schema.literal('approle')]),
  namespace: schema.maybe(schema.string()),
  kvMount: schema.maybe(schema.string()),
  tlsSkipVerify: schema.maybe(schema.boolean()),
  roleId: schema.maybe(schema.string()),
});

const HashiCorpVaultSecretsSchema = schema.object({
  token: schema.maybe(schema.string()),
  secretId: schema.maybe(schema.string()),
});

const SaveBodySchema = schema.object({
  name: schema.string({ minLength: 1 }),
  type: schema.maybe(schema.literal('hashicorp_vault')),
  secretRefreshInterval: schema.maybe(schema.string()),
  config: HashiCorpVaultConfigSchema,
  secrets: schema.maybe(HashiCorpVaultSecretsSchema),
});

type SaveBody = TypeOf<typeof SaveBodySchema>;

/** PUT: create or update a connection (keyed by name). Blank secrets are kept. */
export const saveVaultConnectionRoute: SyntheticsRestApiRouteFactory<
  VaultConnectionStatus
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.VAULT_CONNECTION,
  validate: { body: SaveBodySchema },
  writeAccess: true,
  handler: async ({ request, response, savedObjectsClient, server, spaceId }) => {
    const body = request.body as SaveBody;
    const type: SecretProviderType = body.type ?? SECRET_PROVIDER_HASHICORP_VAULT;

    if (body.config.authMethod === 'approle' && !body.config.roleId) {
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

    // Preserve stored secrets when the client submits blanks (editing a connection
    // without re-entering its secret).
    const secrets = {
      token: body.secrets?.token || existing?.secrets?.token,
      secretId: body.secrets?.secretId || existing?.secrets?.secretId,
    };

    const attributes: SyntheticsVaultConnection = {
      name: body.name,
      type,
      config: body.config,
      secretRefreshInterval: body.secretRefreshInterval,
      refreshedAt: new Date().toISOString(),
      secrets,
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
