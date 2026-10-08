/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConnectorWithDecryptedSecrets,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { SandboxCallContext } from './tool_utils';

interface AuthorizedConnector {
  connector: ConnectorWithDecryptedSecrets;
}

/**
 * Authorizes an agent's connector for reading and execution in the current space and returns it
 * with its decrypted config and secrets. Works for preconfigured (kibana.yml) and saved connectors.
 */
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

  try {
    const connector = await actions.getConnectorWithDecryptedSecrets(
      callContext.request,
      connectorId
    );
    return { connector };
  } catch (err) {
    return { errorMessage: `Not authorized to use connector '${connectorId}': ${err}` };
  }
};
