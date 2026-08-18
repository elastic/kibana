/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AuthMode } from '@kbn/connector-specs';
import { normalizeAuthorizationHeaderValue } from '@kbn/connector-specs';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server/constants/saved_objects';
import { ConnectorTokenClient } from '@kbn/actions-plugin/server/lib/connector_token_client';
import type { RawAction } from '@kbn/actions-plugin/server/types';
import { getSdlcIntelServices } from './sdlc_intel_services';

export const GITHUB_CONNECTOR_TYPE_ID = '.github';
const BEARER_AUTH_TYPE = 'bearer';
const GITHUB_GLOBAL_AUTH_HEADERS = {
  Accept: 'application/vnd.github+json',
} as const;

const parseBearerToken = (authorizationHeader: unknown): string | undefined => {
  if (typeof authorizationHeader !== 'string' || authorizationHeader.length === 0) {
    return undefined;
  }

  const normalized = normalizeAuthorizationHeaderValue(authorizationHeader);
  const match = normalized.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
};

const resolveGithubConnector = async (
  actionsClient: ActionsClient,
  connectorIdOrName: string
): Promise<{ id: string; actionTypeId: string }> => {
  try {
    const connector = await actionsClient.get({ id: connectorIdOrName, throwIfSystemAction: false });
    return { id: connector.id, actionTypeId: connector.actionTypeId };
  } catch {
    const connectors = await actionsClient.getAll({});
    const byName = connectors.find((connector) => connector.name === connectorIdOrName);
    if (!byName) {
      throw new Error(
        `GitHub connector '${connectorIdOrName}' was not found. Create a .github connector in Stack Management.`
      );
    }
    return { id: byName.id, actionTypeId: byName.actionTypeId };
  }
};

const getDecryptedConnectorAction = async ({
  connectorId,
  request,
}: {
  connectorId: string;
  request: KibanaRequest;
}): Promise<{ secrets: Record<string, unknown>; authMode?: AuthMode }> => {
  const { encryptedSavedObjects, spaces } = getSdlcIntelServices();
  const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
    includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
  });

  const spaceId = spaces?.spacesService.getSpaceId(request);
  const namespace = spaceId && spaceId !== 'default' ? { namespace: spaceId } : {};

  const rawAction = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
    ACTION_SAVED_OBJECT_TYPE,
    connectorId,
    namespace
  );

  return {
    secrets: rawAction.attributes.secrets as Record<string, unknown>,
    authMode: rawAction.attributes.authMode,
  };
};

const resolveTokenFromConnector = async (
  request: KibanaRequest,
  connectorIdOrName: string
): Promise<string> => {
  const { actionsSetup, actionsStart, coreStart, logger } = getSdlcIntelServices();
  const actionsClient = await actionsStart.getActionsClientWithRequest(request);
  const connectorRef = await resolveGithubConnector(actionsClient, connectorIdOrName);

  if (connectorRef.actionTypeId !== GITHUB_CONNECTOR_TYPE_ID) {
    throw new Error(
      `Connector '${connectorIdOrName}' has type '${connectorRef.actionTypeId}', expected '${GITHUB_CONNECTOR_TYPE_ID}'.`
    );
  }

  const connector = await actionsClient.get({ id: connectorRef.id, throwIfSystemAction: false });
  const { secrets, authMode } = await getDecryptedConnectorAction({
    connectorId: connector.id,
    request,
  });

  if (secrets.authType === BEARER_AUTH_TYPE && typeof secrets.token === 'string') {
    return secrets.token;
  }

  const encryptedSavedObjectsClient = getSdlcIntelServices().encryptedSavedObjects.getClient({
    includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
  });
  const unsecuredSavedObjectsClient = coreStart.savedObjects.getScopedClient(request);
  const connectorTokenClient = new ConnectorTokenClient({
    encryptedSavedObjectsClient,
    unsecuredSavedObjectsClient,
    logger,
  });

  const axiosInstance = await actionsSetup.getAxiosInstanceWithAuth({
    connectorId: connector.id,
    secrets,
    authMode: authMode ?? connector.authMode,
    connectorTokenClient,
    additionalHeaders: GITHUB_GLOBAL_AUTH_HEADERS,
  });

  const token = parseBearerToken(axiosInstance.defaults.headers.common.Authorization);
  if (!token) {
    throw new Error(
      `Could not resolve a GitHub bearer token from connector '${connectorIdOrName}'. Re-authenticate the connector if it uses OAuth.`
    );
  }

  return token;
};

export const resolveGithubToken = async ({
  request,
  githubToken,
  githubConnectorId,
}: {
  request: KibanaRequest;
  githubToken?: string;
  githubConnectorId?: string;
}): Promise<string> => {
  if (githubToken) {
    return githubToken;
  }

  if (githubConnectorId) {
    return resolveTokenFromConnector(request, githubConnectorId);
  }

  const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (envToken) {
    return envToken;
  }

  throw new Error(
    'GitHub credentials are required. Provide githubConnectorId (recommended), githubToken, or set GITHUB_TOKEN on the Kibana server.'
  );
};
