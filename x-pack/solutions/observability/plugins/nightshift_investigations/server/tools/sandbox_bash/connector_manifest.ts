/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentConnector, ActionsClient } from './agent_connectors';
import { listAgentConnectors } from './agent_connectors';
import type { SandboxApiClient } from './grpc_client';
import type { SandboxCallContext } from './tool_utils';

const renderConnectorSection = (connector: AgentConnector): string =>
  `## ${connector.name} (connector-id: ${connector.id}, type: ${connector.actionTypeId})`;

export const writeConnectorManifest = async ({
  conversationId,
  apiClient,
  callContext,
  getActionsClient,
  logger,
}: {
  conversationId: string;
  apiClient: SandboxApiClient;
  callContext: SandboxCallContext;
  getActionsClient: ((req: KibanaRequest) => Promise<ActionsClient>) | undefined;
  logger: Logger;
}): Promise<void> => {
  const connectors = await listAgentConnectors(callContext, getActionsClient);

  const sections: string[] = [
    '# Sandbox Connectors',
    '',
    'Connector credentials are never stored in this sandbox. To use a connector, pass its id as the',
    '`connector_id` parameter of the bash tool. For that single command only, the environment contains:',
    '',
    '- `CONNECTOR_ID`, `CONNECTOR_TYPE`',
    '- `CONNECTOR_CONFIG_<KEY>` for each connector setting (e.g. `CONNECTOR_CONFIG_APIURL`)',
    '- `CONNECTOR_SECRET_<KEY>` for each credential (e.g. `CONNECTOR_SECRET_TOKEN`, `CONNECTOR_SECRET_APIKEY`)',
    '',
    'Keys are upper-cased with non-alphanumerics replaced by `_`. Discover the names available for a connector with:',
    '```bash',
    'env | grep ^CONNECTOR_ | cut -d= -f1',
    '```',
    'Then call the service directly, e.g.:',
    '```bash',
    'curl -sS -H "Authorization: Bearer $CONNECTOR_SECRET_TOKEN" "$CONNECTOR_CONFIG_APIURL/..."',
    '```',
    'Never print, log, or write credential values to files; they are redacted from command output.',
    'Only the connectors listed below can be requested.',
  ];

  if (connectors.length === 0) {
    sections.push('', '---', '', '*(No connectors are assigned to this agent.)*');
  } else {
    for (const connector of connectors) {
      sections.push('', '---', '', renderConnectorSection(connector));
    }
  }

  const content = sections.join('\n') + '\n';

  logger.debug(
    `Writing connector manifest for conversation ${conversationId} (${connectors.length} connector(s))`
  );

  await apiClient.writeFiles(conversationId, [
    { path: '/workspace/connectors.md', content: Buffer.from(content, 'utf8') },
  ]);
};
