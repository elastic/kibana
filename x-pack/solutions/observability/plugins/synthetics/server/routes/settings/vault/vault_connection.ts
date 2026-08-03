/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { appContextService } from '@kbn/fleet-plugin/server/services';
import { isSecretStorageEnabled } from '@kbn/fleet-plugin/server/services/secrets';
import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';
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
import { VAULT_CONNECTION_NAME_REGEX } from '../../../synthetics_service/formatters/vault_param_formatter';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';

// Whether the connection has its provider secret stored, so the UI can render
// "•••• saved" without receiving the value. Prefers the stored `hasSecret` marker
// (present on the non-decrypting list read); falls back to inspecting the secrets
// for the just-saved attributes, whose secrets are still in memory.
const hasStoredSecret = (a: SyntheticsVaultConnection): boolean => {
  if (typeof a.hasSecret === 'boolean') return a.hasSecret;
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

// Upper bound for any single connection string; these flow into SO docs and the
// delivered policy blob, so keep them bounded (AGENTS.md).
const MAX_LEN = 2048;

const isHttpUrl = (v: string): string | undefined => {
  try {
    const { protocol } = new URL(v);
    return protocol === 'http:' || protocol === 'https:' ? undefined : 'must be an http(s) URL';
  } catch (e) {
    return 'must be a valid URL';
  }
};

// A Go duration string, e.g. "5m", "30s", "1.5h" — matches Heartbeat's parser so a
// value that would fail at config-unpack on every agent is rejected up front.
const isDuration = (v: string): string | undefined =>
  /^\d+(\.\d+)?(ms|s|m|h)$/.test(v) ? undefined : 'must be a duration like "5m", "30s", or "1h"';

// HashiCorp Vault provider request shapes. Adding a provider means adding its
// config/secrets schema and turning `type`/`config`/`secrets` into a discriminated
// `schema.oneOf` keyed on `type`.
const HashiCorpVaultConfigSchema = schema.object({
  address: schema.string({ minLength: 1, maxLength: MAX_LEN, validate: isHttpUrl }),
  authMethod: schema.oneOf([schema.literal('token'), schema.literal('approle')]),
  namespace: schema.maybe(schema.string({ maxLength: MAX_LEN })),
  kvMount: schema.maybe(schema.string({ maxLength: MAX_LEN })),
  tlsSkipVerify: schema.maybe(schema.boolean()),
  roleId: schema.maybe(schema.string({ maxLength: MAX_LEN })),
});

const HashiCorpVaultSecretsSchema = schema.object({
  token: schema.maybe(schema.string({ maxLength: MAX_LEN })),
  secretId: schema.maybe(schema.string({ maxLength: MAX_LEN })),
});

const SaveBodySchema = schema.object({
  name: schema.string({
    minLength: 1,
    maxLength: MAX_LEN,
    validate: (v) =>
      VAULT_CONNECTION_NAME_REGEX.test(v)
        ? undefined
        : 'must contain only letters, numbers, and . _ -',
  }),
  type: schema.maybe(schema.literal('hashicorp_vault')),
  secretRefreshInterval: schema.maybe(schema.string({ maxLength: 32, validate: isDuration })),
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

    const id = vaultConnectionId(body.name, spaceId);
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
      // Only a genuine "not found" means this is a brand-new connection. Any other
      // error (decrypt failure, ES outage, key rotation) must NOT be swallowed:
      // treating it as "new" would let a blank-secret edit overwrite the stored
      // credential with `undefined` and silently destroy it.
      if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw e;
      }
      existing = undefined;
    }

    // A5: re-pointing an existing connection is credential-sensitive. If the
    // address or auth method changes, require the secret to be re-entered rather
    // than silently reusing the stored one — otherwise a write-capable user could
    // aim an existing connection at an attacker-controlled endpoint (leaving the
    // secret blank to preserve it) and have private agents authenticate there with
    // the real credential.
    const providedSecret =
      body.config.authMethod === 'token' ? body.secrets?.token : body.secrets?.secretId;
    const credentialSensitiveChange =
      !!existing &&
      (existing.config.address !== body.config.address ||
        existing.config.authMethod !== body.config.authMethod);
    if (credentialSensitiveChange && !providedSecret) {
      return response.badRequest({
        body: {
          message:
            'The Vault secret must be re-entered when changing the connection address or auth method.',
        },
      });
    }

    // Preserve the stored secret on a blank edit ONLY when the endpoint and auth
    // method are unchanged (see A5 above).
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

    const attributes: SyntheticsVaultConnection = {
      name: body.name,
      type,
      config: body.config,
      secretRefreshInterval: body.secretRefreshInterval,
      refreshedAt: new Date().toISOString(),
      secrets,
      hasSecret,
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
  validate: { params: schema.object({ name: schema.string({ minLength: 1, maxLength: 1024 }) }) },
  writeAccess: true,
  handler: async ({ request, savedObjectsClient, server, spaceId }) => {
    const { name } = request.params as { name: string };
    await savedObjectsClient.delete(
      syntheticsVaultConnectionType,
      vaultConnectionId(name, spaceId)
    );
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
        // B3: the decrypting finder returns decrypt-failed objects with `error`
        // set and their attributes stripped — re-creating those would wipe the
        // secret. Skip them.
        if (so.error || !so.attributes) continue;
        await savedObjectsClient.create<SyntheticsVaultConnection>(
          syntheticsVaultConnectionType,
          { ...so.attributes, refreshedAt },
          // B5: preserve the object's actual namespaces on overwrite rather than
          // forcing [spaceId], which would narrow (or error on) a shared object.
          { id: so.id, overwrite: true, initialNamespaces: so.namespaces ?? [spaceId] }
        );
      }
    }
    finder.close().catch(() => {});

    await propagate(server, spaceId);
    return listConnections(routeContext);
  },
});

interface TestResult {
  ok: boolean;
  message: string;
}

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

interface VaultHttpResponse {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Minimal Vault HTTP call using Node's http(s) client — there is no official Node
 * Vault client, and new Kibana code must use fetch/node http rather than axios.
 * Resolves on any HTTP status (a sealed/standby Vault is still "reachable"); only
 * transport failures reject.
 */
const vaultHttp = (
  urlStr: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    tlsSkipVerify?: boolean;
  }
): Promise<VaultHttpResponse> =>
  new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(urlStr);
    } catch (e) {
      reject(new Error('invalid Vault address'));
      return;
    }
    const isHttps = url.protocol === 'https:';
    const doRequest = isHttps ? httpsRequest : httpRequest;
    const req = doRequest(
      url,
      {
        method: opts.method ?? 'GET',
        headers: {
          ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
          ...opts.headers,
        },
        timeout: 8000,
        ...(isHttps && opts.tlsSkipVerify ? { rejectUnauthorized: false } : {}),
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let body: Record<string, unknown> = {};
          try {
            body = data ? JSON.parse(data) : {};
          } catch (e) {
            body = {};
          }
          resolve({ status: res.statusCode ?? 0, body });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('request timed out')));
    if (opts.body) req.write(opts.body);
    req.end();
  });

/**
 * Verifies Kibana can reach the Vault address and authenticate with the given
 * credentials. This checks reachability *from Kibana*; the agent (Heartbeat)
 * resolves from its own network at runtime, which may differ. Secrets are never
 * returned or logged — only a pass/fail plus the Vault version.
 */
const testHashiCorpVault = async (c: {
  address: string;
  authMethod: 'token' | 'approle';
  namespace?: string;
  tlsSkipVerify?: boolean;
  roleId?: string;
  token?: string;
  secretId?: string;
}): Promise<TestResult> => {
  if (!c.address) return { ok: false, message: 'Vault address is required' };

  const base = c.address.replace(/\/+$/, '');
  const nsHeader: Record<string, string> = c.namespace ? { 'X-Vault-Namespace': c.namespace } : {};
  const call = (path: string, opts: Parameters<typeof vaultHttp>[1] = {}) =>
    vaultHttp(`${base}${path}`, {
      ...opts,
      tlsSkipVerify: c.tlsSkipVerify,
      headers: { ...nsHeader, ...opts.headers },
    });

  // 1) Reachability + version (unauthenticated health endpoint).
  let versionNote = '';
  try {
    const health = await call(
      '/v1/sys/health?standbyok=true&perfstandbyok=true&sealedok=true&uninitcode=200'
    );
    const version = health.body?.version;
    if (typeof version === 'string') versionNote = ` (Vault ${version})`;
  } catch (e) {
    return { ok: false, message: `Could not reach ${base}: ${errText(e)}` };
  }

  // 2) Authenticate with the configured method.
  try {
    if (c.authMethod === 'token') {
      if (!c.token) return { ok: false, message: 'Token auth requires a token' };
      const res = await call('/v1/auth/token/lookup-self', {
        headers: { 'X-Vault-Token': c.token },
      });
      return res.status >= 200 && res.status < 300
        ? { ok: true, message: `Token authenticated${versionNote}.` }
        : { ok: false, message: `Token rejected (HTTP ${res.status})${versionNote}.` };
    }

    if (!c.roleId || !c.secretId) {
      return { ok: false, message: 'AppRole auth requires role_id and secret_id' };
    }
    const res = await call('/v1/auth/approle/login', {
      method: 'POST',
      body: JSON.stringify({ role_id: c.roleId, secret_id: c.secretId }),
    });
    const auth = res.body?.auth as { client_token?: string } | undefined;
    if (res.status >= 200 && res.status < 300 && auth?.client_token) {
      return { ok: true, message: `AppRole authenticated${versionNote}.` };
    }
    const errs = Array.isArray(res.body?.errors) ? (res.body.errors as string[]).join('; ') : '';
    return {
      ok: false,
      message: `AppRole login failed (HTTP ${res.status})${errs ? `: ${errs}` : ''}${versionNote}.`,
    };
  } catch (e) {
    return { ok: false, message: `Authentication error: ${errText(e)}` };
  }
};

const TestBodySchema = schema.object({
  // When editing a saved connection with the secret left blank, `name` lets the
  // server fall back to the stored secret so Test works without re-entry.
  name: schema.maybe(schema.string()),
  type: schema.maybe(schema.literal('hashicorp_vault')),
  config: HashiCorpVaultConfigSchema,
  secrets: schema.maybe(HashiCorpVaultSecretsSchema),
});

type TestBody = TypeOf<typeof TestBodySchema>;

/** POST /_test: check reachability + auth from Kibana. Never persists anything. */
export const testVaultConnectionRoute: SyntheticsRestApiRouteFactory<TestResult> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.VAULT_CONNECTION + '/_test',
  validate: { body: TestBodySchema },
  writeAccess: true,
  handler: async ({ request, server, spaceId }) => {
    const body = request.body as TestBody;
    const { address, authMethod, namespace, tlsSkipVerify, roleId } = body.config;

    // Fall back to the stored secret when the client submits a blank (editing).
    let token = body.secrets?.token;
    let secretId = body.secrets?.secretId;
    const missingSecret = authMethod === 'token' ? !token : !secretId;
    if (missingSecret && body.name) {
      try {
        const decrypted = await server.encryptedSavedObjects
          .getClient()
          .getDecryptedAsInternalUser<SyntheticsVaultConnection>(
            syntheticsVaultConnectionType,
            vaultConnectionId(body.name, spaceId),
            { namespace: spaceId }
          );
        token = token || decrypted.attributes.secrets?.token;
        secretId = secretId || decrypted.attributes.secrets?.secretId;
      } catch (e) {
        // No stored connection; testHashiCorpVault reports the missing secret.
      }
    }

    return testHashiCorpVault({
      address,
      authMethod,
      namespace,
      tlsSkipVerify,
      roleId,
      token,
      secretId,
    });
  },
});

/**
 * Whether Fleet secret storage is enabled. Runs as the internal user (so the
 * caller needs no Fleet privileges). When it is disabled, Fleet stores the
 * delivered Vault credential blob in plaintext in the agent policy rather than as
 * a Fleet secret — which is what the Private Locations UI warns about.
 */
const getFleetSecretStorageEnabled = async (server: SyntheticsServerSetup): Promise<boolean> => {
  try {
    const esClient = server.coreStart.elasticsearch.client.asInternalUser;
    const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
    return await isSecretStorageEnabled(esClient, soClient);
  } catch (e) {
    server.logger.error(`Vault: failed to determine Fleet secret storage status: ${e.message}`);
    // Don't raise a false alarm if the check itself fails.
    return true;
  }
};

/** GET: secret-storage status + whether this space has any Vault connections. */
export const getFleetSecretStorageStatusRoute: SyntheticsRestApiRouteFactory<{
  secretStorageEnabled: boolean;
  hasVaultConnections: boolean;
}> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.FLEET_SECRET_STORAGE_STATUS,
  validate: {},
  handler: async (routeContext) => {
    const [secretStorageEnabled, connections] = await Promise.all([
      getFleetSecretStorageEnabled(routeContext.server),
      listConnections(routeContext),
    ]);
    return { secretStorageEnabled, hasVaultConnections: connections.length > 0 };
  },
});
