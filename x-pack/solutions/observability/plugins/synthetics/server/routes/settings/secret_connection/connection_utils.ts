/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpResponsePayload, ResponseError } from '@kbn/core-http-server';
import type { SyntheticsServerSetup } from '../../../types';
import type { RouteContext, SyntheticsRouteHandler } from '../../types';
import { isSecretConnectionsEnabled } from '../../../config';
import type {
  SyntheticsSecretConnection,
  SecretConnectionStatus,
} from '../../../../common/runtime_types';
import { syntheticsSecretConnectionType } from '../../../../common/types/saved_objects';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';

// Whether the connection has its provider secret stored, so the UI can render
// "•••• saved" without receiving the value. Prefers the stored `hasSecret` marker
// (present on the non-decrypting list read); falls back to inspecting the secrets
// for the just-saved attributes, whose secrets are still in memory.
const hasStoredSecret = (a: SyntheticsSecretConnection): boolean => {
  if (typeof a.hasSecret === 'boolean') return a.hasSecret;
  const secrets = a.secrets ?? {};
  return a.config.authMethod === 'token' ? Boolean(secrets.token) : Boolean(secrets.secretId);
};

export const toStatus = (attributes: SyntheticsSecretConnection): SecretConnectionStatus => ({
  configured: true,
  name: attributes.name,
  type: attributes.type,
  refreshedAt: attributes.refreshedAt,
  // Non-secret provider config, returned verbatim.
  config: attributes.config,
  hasSecret: hasStoredSecret(attributes),
});

// Re-push private-location configs so the updated connections reach agents,
// forcing Heartbeat to re-resolve — how a save/refresh/delete propagates.
export const propagate = (server: SyntheticsServerSetup, spaceId: string) =>
  asyncGlobalParamsPropagation({ server, paramsSpacesToSync: [spaceId] });

export const listConnections = async ({
  savedObjectsClient,
}: Pick<RouteContext, 'savedObjectsClient'>): Promise<SecretConnectionStatus[]> => {
  const finder = savedObjectsClient.createPointInTimeFinder<SyntheticsSecretConnection>({
    type: syntheticsSecretConnectionType,
    perPage: 1000,
  });
  const out: SecretConnectionStatus[] = [];
  for await (const result of finder.find()) {
    for (const so of result.saved_objects) {
      out.push(toStatus(so.attributes));
    }
  }
  finder.close().catch(() => {});
  return out;
};

/** The names in `names` that no connection of this space has. */
export const findUnknownConnections = async (
  routeContext: Pick<RouteContext, 'savedObjectsClient'>,
  names: string[]
): Promise<string[]> => {
  if (names.length === 0) return [];
  const known = new Set((await listConnections(routeContext)).map(({ name }) => name));
  return [...new Set(names)].filter((name) => !known.has(name));
};

export const SECRET_CONNECTIONS_DISABLED_MESSAGE =
  'Vault secret references are not available in this deployment';

/** Wraps a route handler so it responds 404 while secret connections are disabled. */
export const whenSecretConnectionsEnabled =
  <ClientContract extends HttpResponsePayload | ResponseError>(
    handler: SyntheticsRouteHandler<ClientContract>
  ): SyntheticsRouteHandler<ClientContract> =>
  async (routeContext) =>
    isSecretConnectionsEnabled(routeContext.server.config)
      ? handler(routeContext)
      : routeContext.response.notFound({ body: { message: SECRET_CONNECTIONS_DISABLED_MESSAGE } });

export const unknownConnectionsMessage = (names: string[]): string =>
  `Vault connection ${names.map((name) => `"${name}"`).join(', ')} is not configured in this space`;
