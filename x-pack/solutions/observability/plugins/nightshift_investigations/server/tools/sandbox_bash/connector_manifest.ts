/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AuditedSandboxSession } from '../../sandbox_audit';
import type { AgentConnector, ActionsClient } from './agent_connectors';
import { listAgentConnectors } from './agent_connectors';
import { CONNECTOR_ENV_PREFIX, toEnvKey } from './connector_credentials';
import type { SandboxCallContext } from './tool_utils';
import { CONNECTOR_DOCS, CONNECTOR_DOCS_ROOT, CONNECTOR_MANIFEST_PATH } from './connector_docs';

const renderConnectorSection = (connector: AgentConnector): string =>
  `## ${connector.name} (connector-id: ${connector.id}, type: ${
    connector.actionTypeId
  })\n\nEnvironment prefix: \`${CONNECTOR_ENV_PREFIX}${toEnvKey(connector.id)}_\``;

const renderGuidesSection = (): string[] => [
  '',
  '---',
  '',
  '# Service guides',
  '',
  'API recipes and how to authenticate through a connector, or without credentials where the',
  'service allows it. Read one when you need that service.',
  '',
  ...CONNECTOR_DOCS.map(({ service, path }) => `- ${service}: \`${path}\``),
];

export const writeConnectorManifest = async ({
  session,
  callContext,
  getActionsClient,
  logger,
}: {
  session: AuditedSandboxSession;
  callContext: SandboxCallContext;
  getActionsClient: ((req: KibanaRequest) => Promise<ActionsClient>) | undefined;
  logger: Logger;
}): Promise<void> => {
  const connectors = await listAgentConnectors(callContext, getActionsClient);

  const sections: string[] = [
    '# Sandbox Connectors',
    '',
    'Connector credentials are never stored in this sandbox. Pass ids to the bash tool as',
    '`connector_ids: ["github-1", "search-1"]` (at most 5 array entries; exact duplicates removed).',
    'Omitted or `connector_ids: []` runs without credentials. For that single command only,',
    'ALL selected variables are namespaced, even when selecting just one connector:',
    '',
    '- `CONNECTOR_<NORMALIZED_ID>_ID`, `CONNECTOR_<NORMALIZED_ID>_TYPE`',
    '- `CONNECTOR_<NORMALIZED_ID>_CONFIG_<KEY>`',
    '- `CONNECTOR_<NORMALIZED_ID>_HEADER_<NAME>`',
    '',
    'Normalize ids and keys to uppercase, replace each non-alphanumeric run with `_`, and trim edge `_`.',
    'For example, `github-1` uses `CONNECTOR_GITHUB_1_HEADER_AUTHORIZATION` and `CONNECTOR_GITHUB_1_CONFIG_SERVERURL`.',
    'Empty normalized ids, colliding normalized ids, and colliding final environment keys fail the whole call.',
    'Every selected connector must resolve successfully before the command runs. Command network access',
    'combines the space rules and selected connector hosts, preserving existing scoped space rules;',
    'each secret remains bound only to its own connector hosts.',
    '',
    'Discover the names available for a connector with:',
    '```bash',
    'env | grep ^CONNECTOR_ | cut -d= -f1',
    '```',
    'Each connector below lists its exact environment prefix. Append CONFIG_<KEY>, HEADER_<NAME>,',
    'ID or TYPE to that prefix. This Elasticsearch example assumes connector_ids: ["search-1"];',
    'replace CONNECTOR_SEARCH_1_ with the listed prefix of the selected connector:',
    '```bash',
    'curl -sS -H "Authorization: $CONNECTOR_SEARCH_1_HEADER_AUTHORIZATION" "$CONNECTOR_SEARCH_1_CONFIG_URL/_cluster/health"',
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

  const files = [
    { path: CONNECTOR_MANIFEST_PATH, content: Buffer.from(content, 'utf8') },
    ...CONNECTOR_DOCS.map(({ path, content: doc }) => ({
      path,
      content: Buffer.from(doc, 'utf8'),
    })),
  ];
  await session.mkdirs([CONNECTOR_DOCS_ROOT]);
  const results = await session.writeFiles(files);
  // A failed overwrite can leave a stale file that the workspace cache would take as ready.
  const failedPaths = files.filter((_, index) => !results[index]?.success).map(({ path }) => path);
  if (failedPaths.length > 0) {
    throw new Error(`Failed to write sandbox connector guidance: ${failedPaths.join(', ')}`);
  }
};
