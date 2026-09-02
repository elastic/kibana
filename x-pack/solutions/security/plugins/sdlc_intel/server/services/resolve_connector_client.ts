/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

// Type-only: describes the AxiosInstance returned by Kibana's own
// actions getAxiosInstanceWithAuth. No runtime axios usage.
// eslint-disable-next-line no-restricted-imports
import type { AxiosInstance } from 'axios';
import type { KibanaRequest } from '@kbn/core/server';
import type { AuthMode } from '@kbn/connector-specs';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server/constants/saved_objects';
import type { RawAction } from '@kbn/actions-plugin/server/types';
import { getSdlcIntelServices } from './sdlc_intel_services';

const resolveConnector = async (
  actionsClient: ActionsClient,
  connectorIdOrName: string,
  expectedTypeId: string
): Promise<{ id: string; actionTypeId: string }> => {
  try {
    const connector = await actionsClient.get({
      id: connectorIdOrName,
      throwIfSystemAction: false,
    });
    if (connector.actionTypeId !== expectedTypeId) {
      throw new Error(
        `Connector '${connectorIdOrName}' has type '${connector.actionTypeId}', expected '${expectedTypeId}'.`
      );
    }
    return { id: connector.id, actionTypeId: connector.actionTypeId };
  } catch {
    const connectors = await actionsClient.getAll({});
    const byName = connectors.find(
      (connector) =>
        connector.name === connectorIdOrName && connector.actionTypeId === expectedTypeId
    );
    if (!byName) {
      throw new Error(
        `Connector '${connectorIdOrName}' was not found. Create a ${expectedTypeId} connector in Stack Management.`
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

export const resolveConnectorAxiosClient = async ({
  request,
  connectorIdOrName,
  expectedTypeId,
  additionalHeaders,
}: {
  request: KibanaRequest;
  connectorIdOrName: string;
  expectedTypeId: string;
  additionalHeaders?: Record<string, string>;
}): Promise<AxiosInstance> => {
  const { actionsSetup, actionsStart } = getSdlcIntelServices();
  const actionsClient = await actionsStart.getActionsClientWithRequest(request);
  const connectorRef = await resolveConnector(actionsClient, connectorIdOrName, expectedTypeId);
  const connector = await actionsClient.get({ id: connectorRef.id, throwIfSystemAction: false });
  const { secrets, authMode } = await getDecryptedConnectorAction({
    connectorId: connector.id,
    request,
  });


  return actionsSetup.getAxiosInstanceWithAuth({
    connectorId: connector.id,
    secrets,
    authMode: authMode ?? connector.authMode,
    additionalHeaders,
  });
};
