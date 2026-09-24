/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { AgentConnector, ActionsClient } from './agent_connectors';
import { listAgentConnectors } from './agent_connectors';
import type { SandboxCallContext } from './tool_utils';

export type GetSandboxEnvVarDefinitions = ActionsPluginStart['getSandboxEnvVarDefinitions'];

const PRECONFIGURED_ENV_LINES = [
  'Environment variables: `CONNECTOR_CONFIG_<KEY>` for each connector setting and',
  '`CONNECTOR_SECRET_<KEY>` for each credential (keys upper-cased, non-alphanumerics replaced by `_`).',
  'Discover the names with:',
  '```bash',
  'env | grep ^CONNECTOR_ | cut -d= -f1',
  '```',
];

const renderConnectorSection = (
  connector: AgentConnector,
  getSandboxEnvVarDefinitions: GetSandboxEnvVarDefinitions | undefined
): string[] => {
  const heading = `## ${connector.name} (connector-id: ${connector.id}, type: ${connector.actionTypeId})`;

  const envVarDefinitions = getSandboxEnvVarDefinitions?.(connector.actionTypeId);
  if (envVarDefinitions) {
    return [
      heading,
      '',
      'Environment variables:',
      ...Object.entries(envVarDefinitions).map(
        ([name, { description, sensitive }]) =>
          `- \`${name}\`${sensitive ? ' (secret)' : ''}: ${description}`
      ),
    ];
  }

  if (connector.isPreconfigured) {
    return [heading, '', ...PRECONFIGURED_ENV_LINES];
  }

  return [
    heading,
    '',
    '*Not usable from the sandbox: this connector type does not expose environment variables.*',
  ];
};

export const writeConnectorManifest = async ({
  session,
  callContext,
  getActionsClient,
  getSandboxEnvVarDefinitions,
  logger,
}: {
  session: SandboxSession;
  callContext: SandboxCallContext;
  getActionsClient: ((req: KibanaRequest) => Promise<ActionsClient>) | undefined;
  getSandboxEnvVarDefinitions: GetSandboxEnvVarDefinitions | undefined;
  logger: Logger;
}): Promise<void> => {
  const connectors = await listAgentConnectors(callContext, getActionsClient);

  const sections: string[] = [
    '# Sandbox Connectors',
    '',
    'Connector credentials are never stored in this sandbox. To use a connector, pass its id as the',
    '`connector_id` parameter of the bash tool. For that single command only, the environment contains',
    '`CONNECTOR_ID`, `CONNECTOR_TYPE`, and the variables listed under that connector below.',
    'Reference them directly, e.g.:',
    '```bash',
    'curl -sS -H "Authorization: Bearer $GH_TOKEN" "$GITHUB_API_URL/user"',
    '```',
    'Never print, log, or write credential values to files; secret values are redacted from command output.',
    'Only the connectors listed below can be requested.',
  ];

  if (connectors.length === 0) {
    sections.push('', '---', '', '*(No connectors are assigned to this agent.)*');
  } else {
    for (const connector of connectors) {
      sections.push(
        '',
        '---',
        '',
        ...renderConnectorSection(connector, getSandboxEnvVarDefinitions)
      );
    }
  }

  const content = sections.join('\n') + '\n';

  logger.debug(`Writing connector manifest (${connectors.length} connector(s))`);

  await session.writeFiles([
    { path: '/workspace/connectors.md', content: Buffer.from(content, 'utf8') },
  ]);
};
