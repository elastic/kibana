/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { AgentConnector, ActionsClient } from './agent_connectors';
import { listAgentConnectors } from './agent_connectors';
import type { SandboxCallContext } from './tool_utils';
import {
  CONNECTOR_DOCS,
  CONNECTOR_DOCS_ROOT,
  CONNECTOR_MANIFEST_PATH,
  ELASTIC_MANIFEST_PATH,
} from './connector_docs';

const renderConnectorSection = (connector: AgentConnector): string =>
  `## ${connector.name} (connector-id: ${connector.id}, type: ${connector.actionTypeId})`;

const renderGuidesSection = (): string[] => [
  '',
  '---',
  '',
  '# Service guides',
  '',
  'API recipes and how to authenticate through a connector, or without credentials where the',
  'service allows it. Read one when you need that service.',
  '',
  `- Elasticsearch: \`${ELASTIC_MANIFEST_PATH}\``,
  ...CONNECTOR_DOCS.map(({ service, path }) => `- ${service}: \`${path}\``),
];

export const writeConnectorManifest = async ({
  session,
  callContext,
  getActionsClient,
  logger,
}: {
  session: SandboxSession;
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
    '- `CONNECTOR_HEADER_<NAME>` for each normalized authentication header (e.g. `CONNECTOR_HEADER_AUTHORIZATION`)',
    '',
    'Keys are upper-cased with non-alphanumerics replaced by `_`. Discover the names available for a connector with:',
    '```bash',
    'env | grep ^CONNECTOR_ | cut -d= -f1',
    '```',
    'Then call the service directly, e.g.:',
    '```bash',
    'curl -sS -H "Authorization: $CONNECTOR_HEADER_AUTHORIZATION" "$CONNECTOR_CONFIG_APIURL/..."',
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

  sections.push(...renderGuidesSection());

  const content = sections.join('\n') + '\n';

  logger.debug(`Writing connector manifest (${connectors.length} connector(s))`);

  await session.mkdirs([CONNECTOR_DOCS_ROOT]);
  await session.writeFiles([
    { path: CONNECTOR_MANIFEST_PATH, content: Buffer.from(content, 'utf8') },
    ...CONNECTOR_DOCS.map(({ path, content: doc }) => ({
      path,
      content: Buffer.from(doc, 'utf8'),
    })),
  ]);
};
