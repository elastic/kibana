/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { HttpResponsePayload, ResponseError } from '@kbn/core-http-server';
import type { SyntheticsServerSetup } from '../../../types';
import type { RouteContext, SyntheticsRouteHandler } from '../../types';
import { isSecretConnectionsEnabled } from '../../../config';
import type {
  SyntheticsSecretConnection,
  SecretConnectionStatus,
} from '../../../../common/runtime_types';
import { ConfigKey } from '../../../../common/runtime_types';
import { syntheticsSecretConnectionType } from '../../../../common/types/saved_objects';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';
import { getParamsForSpace } from '../../../synthetics_service/formatters/param_utils';
import {
  findMalformedVaultReferences,
  malformedVaultReferencesMessage,
  referencedConnectionNames,
  valueContainsVaultReference,
} from '../../../synthetics_service/formatters/vault_param_formatter';
import { normalizeSecrets } from '../../../synthetics_service/utils';

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

export const UNNAMED_VAULT_REFERENCE_MESSAGE =
  'A Vault reference must name its connection: vault://<connection>@<path>#<field>';

/** Why Vault references in these param values cannot be saved, or `undefined` when they can. */
export const findParamVaultReferenceError = async (
  routeContext: Pick<RouteContext, 'savedObjectsClient' | 'server'>,
  values: Array<string | undefined>
): Promise<string | undefined> => {
  const withReferences = values.filter(valueContainsVaultReference);
  if (withReferences.length === 0) return undefined;
  if (!isSecretConnectionsEnabled(routeContext.server.config)) {
    return SECRET_CONNECTIONS_DISABLED_MESSAGE;
  }
  const malformed = withReferences.flatMap(findMalformedVaultReferences);
  if (malformed.length > 0) {
    return `Malformed Vault reference ${malformedVaultReferencesMessage(malformed)}`;
  }
  const names = withReferences.flatMap((value) => [...referencedConnectionNames(value)]);
  if (names.includes(undefined)) return UNNAMED_VAULT_REFERENCE_MESSAGE;
  const unknown = await findUnknownConnections(
    routeContext,
    names.filter((name): name is string => name !== undefined)
  );
  return unknown.length > 0 ? unknownConnectionsMessage(unknown) : undefined;
};

export interface ConnectionReferences {
  params: string[];
  monitors: string[];
}

/**
 * Params and monitors of the space that reference the connection by name. Deleting a
 * referenced connection would leave its credential in those monitors' Fleet policies,
 * because policy generation then skips them instead of rewriting them.
 */
export const findConnectionReferences = async (
  {
    syntheticsMonitorClient,
    monitorConfigRepository,
    spaceId,
  }: Pick<RouteContext, 'syntheticsMonitorClient' | 'monitorConfigRepository' | 'spaceId'>,
  name: string
): Promise<ConnectionReferences> => {
  const [paramsBySpace, monitors] = await Promise.all([
    syntheticsMonitorClient.getSyntheticsParams({ spaceId }),
    monitorConfigRepository.findDecryptedMonitors({ spaceId }),
  ]);
  const params = Object.entries(getParamsForSpace(paramsBySpace, spaceId))
    .filter(([, value]) => referencedConnectionNames(value).has(name))
    .map(([key]) => key);
  const monitorNames = monitors
    .map((monitor) => normalizeSecrets(monitor).attributes)
    .filter((attributes) =>
      referencedConnectionNames(
        omit(attributes, [ConfigKey.SOURCE_INLINE, ConfigKey.SOURCE_PROJECT_CONTENT])
      ).has(name)
    )
    .map((attributes) => attributes[ConfigKey.NAME]);
  return { params, monitors: monitorNames };
};

const MAX_LISTED_REFERENCES = 5;
const listNames = (names: string[]): string => {
  const listed = names
    .slice(0, MAX_LISTED_REFERENCES)
    .map((name) => `"${name}"`)
    .join(', ');
  const rest = names.length - MAX_LISTED_REFERENCES;
  return rest > 0 ? `${listed} and ${rest} more` : listed;
};

export const connectionInUseMessage = (
  name: string,
  { params, monitors }: ConnectionReferences
): string => {
  const users = [
    params.length ? `parameters ${listNames(params)}` : '',
    monitors.length ? `monitors ${listNames(monitors)}` : '',
  ]
    .filter(Boolean)
    .join(' and ');
  return `Vault connection "${name}" is still referenced by ${users}. Point them at another connection before deleting it.`;
};
