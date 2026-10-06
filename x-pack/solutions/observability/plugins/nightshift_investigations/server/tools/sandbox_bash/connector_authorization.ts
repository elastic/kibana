/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ActionsClient } from './agent_connectors';
import type { SandboxCallContext } from './tool_utils';

interface AuthorizedConnector {
  connector: Awaited<ReturnType<ActionsClient['get']>>;
  inMemoryConnector: ActionsPluginStart['inMemoryConnectors'][number];
}

/** Authorizes an agent's preconfigured connector for reading and execution in the current space. */
export const authorizeConnector = async (
  connectorId: string,
  callContext: SandboxCallContext,
  actions: ActionsPluginStart | undefined
): Promise<AuthorizedConnector | { errorMessage: string }> => {
  if (!actions) {
    return { errorMessage: 'Connectors are not available in this deployment' };
  }

  if (!callContext.allowedConnectorIds.includes(connectorId)) {
    return {
      errorMessage:
        `Connector '${connectorId}' is not assigned to this agent. ` +
        `Assigned connectors: ${callContext.allowedConnectorIds.join(', ') || 'none'}. ` +
        `Check /workspace/connectors.md.`,
    };
  }

  const { request } = callContext;

  let connector: Awaited<
    ReturnType<Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>['get']>
  >;
  try {
    const actionsClient = await actions.getActionsClientWithRequest(request);
    connector = await actionsClient.get({ id: connectorId });
  } catch (err) {
    return { errorMessage: `Failed to resolve connector '${connectorId}': ${err}` };
  }

  if (connector.isSystemAction) {
    return {
      errorMessage: `Connector '${connectorId}' is a system connector and cannot be used`,
    };
  }

  try {
    await actions.getActionsAuthorizationWithRequest(request).ensureAuthorized({
      operation: 'execute',
      actionTypeId: connector.actionTypeId,
    });
  } catch (err) {
    return { errorMessage: `Not authorized to use connector '${connectorId}': ${err}` };
  }

  const inMemoryConnector = actions.inMemoryConnectors.find(({ id }) => id === connectorId);
  if (!inMemoryConnector) {
    return {
      errorMessage:
        `Connector '${connectorId}' is not a preconfigured connector. Only connectors defined ` +
        `in kibana.yml (xpack.actions.preconfigured) can be used from the sandbox.`,
    };
  }

  return { connector, inMemoryConnector };
};
