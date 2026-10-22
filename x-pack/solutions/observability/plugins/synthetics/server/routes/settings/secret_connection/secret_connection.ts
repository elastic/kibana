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
  SecretConnectionStatus,
  SecretConnectionTestResult,
  SecretProviderType,
  SyntheticsSecretConnection,
} from '../../../../common/runtime_types';
import { SECRET_PROVIDER_HASHICORP_VAULT } from '../../../../common/runtime_types';
import { syntheticsSecretConnectionType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { SECRET_CONNECTION_WRITE_API } from '../../../feature';
import {
  getSecretConnectionEncryptedClient,
  secretConnectionId,
} from '../../../saved_objects/synthetics_secret_connection';
import {
  connectionInUseMessage,
  findConnectionReferences,
  listConnections,
  propagate,
  toStatus,
  whenSecretConnectionsEnabled,
} from './connection_utils';
import { isCredentialSensitiveChange, SECRET_REENTRY_REQUIRED_MESSAGE } from './credential_guard';
import { getAllowedHosts, hostNotAllowedMessage, isAddressHostAllowed } from './address_guard';
import type { SaveBody, TestBody } from './schemas';
import { SaveBodySchema, TestBodySchema } from './schemas';
import { testHashiCorpVault } from './vault_client';

/** GET: list all Vault connections (secret-free). */
export const getSecretConnectionsRoute: SyntheticsRestApiRouteFactory<
  SecretConnectionStatus[]
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SECRET_CONNECTION,
  validate: {},
  handler: whenSecretConnectionsEnabled(async (routeContext) => listConnections(routeContext)),
});

/** PUT: create or update a connection (keyed by name). Blank secrets are kept. */
export const saveSecretConnectionRoute: SyntheticsRestApiRouteFactory<
  SecretConnectionStatus
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.SECRET_CONNECTION,
  validate: { body: SaveBodySchema },
  requiredPrivileges: [SECRET_CONNECTION_WRITE_API],
  handler: whenSecretConnectionsEnabled(
    async ({ request, response, savedObjectsClient, server, spaceId }) => {
      const body = request.body as SaveBody;
      if (!isAddressHostAllowed(body.config.address, getAllowedHosts(server.config))) {
        return response.badRequest({
          body: { message: hostNotAllowedMessage(body.config.address) },
        });
      }
      const type: SecretProviderType = body.type ?? SECRET_PROVIDER_HASHICORP_VAULT;

      if (body.config.authMethod === 'approle' && !body.config.roleId) {
        return response.badRequest({ body: { message: 'approle auth requires a role_id' } });
      }

      const id = secretConnectionId(body.name, spaceId);
      const encryptedClient = getSecretConnectionEncryptedClient(server.encryptedSavedObjects);
      let existing: SyntheticsSecretConnection | undefined;
      try {
        const decrypted =
          await encryptedClient.getDecryptedAsInternalUser<SyntheticsSecretConnection>(
            syntheticsSecretConnectionType,
            id,
            { namespace: spaceId }
          );
        existing = decrypted.attributes;
      } catch (e) {
        // Only a genuine "not found" means this is a brand-new connection. Any other
        // error (decrypt failure, ES outage, key rotation) must NOT be swallowed:
        // treating it as "new" would let a blank-secret edit overwrite the stored
        // credential with `undefined` and silently destroy it.
        if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
          throw e;
        }
        existing = undefined;
      }

      // Re-pointing an existing connection (address, auth method, TLS) must not reuse the
      // stored secret, or a write user could aim it at their own endpoint.
      const providedSecret =
        body.config.authMethod === 'token' ? body.secrets?.token : body.secrets?.secretId;
      const credentialSensitiveChange =
        !!existing && isCredentialSensitiveChange(existing.config, body.config);
      if (credentialSensitiveChange && !providedSecret) {
        return response.badRequest({ body: { message: SECRET_REENTRY_REQUIRED_MESSAGE } });
      }

      // Preserve the stored secret on a blank edit only when nothing credential-sensitive changed.
      const secrets = credentialSensitiveChange
        ? { token: body.secrets?.token, secretId: body.secrets?.secretId }
        : {
            token: body.secrets?.token || existing?.secrets?.token,
            secretId: body.secrets?.secretId || existing?.secrets?.secretId,
          };

      // C9: a new connection must carry a usable credential — otherwise it saves,
      // propagates, and only fails later at the agent.
      const effectiveSecret = body.config.authMethod === 'token' ? secrets.token : secrets.secretId;
      if (!existing && !effectiveSecret) {
        return response.badRequest({
          body: {
            message:
              body.config.authMethod === 'token'
                ? 'A token is required to create a token-auth connection'
                : 'A secret_id is required to create an approle connection',
          },
        });
      }
      // Non-secret marker so the (non-decrypting) list read can report "secret saved".
      const hasSecret =
        body.config.authMethod === 'token' ? Boolean(secrets.token) : Boolean(secrets.secretId);

      const attributes: SyntheticsSecretConnection = {
        name: body.name,
        type,
        config: body.config,
        refreshedAt: new Date().toISOString(),
        secrets,
        hasSecret,
      };

      await savedObjectsClient.create<SyntheticsSecretConnection>(
        syntheticsSecretConnectionType,
        attributes,
        { id, overwrite: true, initialNamespaces: [spaceId] }
      );
      await propagate(server, spaceId);
      return toStatus(attributes);
    }
  ),
});

/** DELETE /{name}: remove a connection. */
export const deleteSecretConnectionRoute: SyntheticsRestApiRouteFactory<
  { deleted: boolean },
  { name: string }
> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.SECRET_CONNECTION + '/{name}',
  validate: { params: schema.object({ name: schema.string({ minLength: 1, maxLength: 1024 }) }) },
  requiredPrivileges: [SECRET_CONNECTION_WRITE_API],
  handler: whenSecretConnectionsEnabled(async (routeContext) => {
    const { request, response, savedObjectsClient, server, spaceId } = routeContext;
    const { name } = request.params as { name: string };
    const references = await findConnectionReferences(routeContext, name);
    if (references.params.length > 0 || references.monitors.length > 0) {
      return response.conflict({ body: { message: connectionInUseMessage(name, references) } });
    }
    await savedObjectsClient.delete(
      syntheticsSecretConnectionType,
      secretConnectionId(name, spaceId)
    );
    await propagate(server, spaceId);
    return { deleted: true };
  }),
});

/** POST /_test: check reachability + auth from Kibana. Never persists anything. */
export const testSecretConnectionRoute: SyntheticsRestApiRouteFactory<
  SecretConnectionTestResult
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SECRET_CONNECTION + '/_test',
  validate: { body: TestBodySchema },
  requiredPrivileges: [SECRET_CONNECTION_WRITE_API],
  handler: whenSecretConnectionsEnabled(async ({ request, server, spaceId }) => {
    const body = request.body as TestBody;
    const { address, authMethod, namespace, tlsSkipVerify, roleId } = body.config;
    if (!isAddressHostAllowed(address, getAllowedHosts(server.config))) {
      return { ok: false, message: hostNotAllowedMessage(address) };
    }

    // Fall back to the stored secret when the client submits a blank (editing), but never
    // for a changed endpoint: that would send the stored credential to a new address.
    let token = body.secrets?.token;
    let secretId = body.secrets?.secretId;
    const missingSecret = authMethod === 'token' ? !token : !secretId;
    if (missingSecret && body.name) {
      try {
        const decrypted = await getSecretConnectionEncryptedClient(
          server.encryptedSavedObjects
        ).getDecryptedAsInternalUser<SyntheticsSecretConnection>(
          syntheticsSecretConnectionType,
          secretConnectionId(body.name, spaceId),
          { namespace: spaceId }
        );
        if (isCredentialSensitiveChange(decrypted.attributes.config, body.config)) {
          return { ok: false, message: SECRET_REENTRY_REQUIRED_MESSAGE };
        }
        token = token || decrypted.attributes.secrets?.token;
        secretId = secretId || decrypted.attributes.secrets?.secretId;
      } catch (e) {
        // No stored connection; testHashiCorpVault reports the missing secret.
      }
    }

    return testHashiCorpVault(
      { address, authMethod, namespace, tlsSkipVerify, roleId, token, secretId },
      server.logger
    );
  }),
});
