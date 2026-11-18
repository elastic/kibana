/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatSchemaForLlm } from '@kbn/agent-builder-server';
import { getConnectorSpec, isSelectedActionEnabled, isToolAction } from '@kbn/connector-specs';
import type { AgentConnector, ActionsClient } from './agent_connectors';

const HEADER = `# Calling Kibana from the sandbox

Commands run by the bash tool can call back into Kibana with \`kbn-tool\`. The call runs in Kibana
as the user of this conversation, so it can only read what you could read with the same tool, and
it never puts credentials into the sandbox. Use it to process query results with jq or Python in
the same command instead of copying them through the conversation.

\`\`\`text
kbn-tool esql [--limit N] [--format ndjson|json|csv] '<ES|QL query>'
kbn-tool call <tool-id> --params '<json object>'        # or --params - to read stdin
kbn-tool connector <connector-id> <sub-action> --params '<json object>' [--format ndjson|json|csv]
\`\`\`

Exit code 0: the result is on stdout. Exit code 1: Kibana refused or failed the call; the reason is on
stderr. Exit code 2: wrong usage, or the command was started without Kibana callbacks.
A result is limited to 2 MiB: ask for fewer rows or fields when a call reports it is too large.

## ES|QL

\`kbn-tool esql\` runs \`platform.core.execute_esql\` and prints one JSON object per row
(\`--format csv\` and \`--format json\` are also available). \`--limit\` defaults to 100 rows.
It queries the Elasticsearch cluster behind this Kibana, not a cluster an Elasticsearch connector
points at: to query a connector's cluster, call the connector's \`esql\` sub-action (see Connectors).

\`\`\`bash
kbn-tool esql 'FROM logs-* | STATS errors = COUNT(*) BY service.name | SORT errors DESC' | jq -r '.["service.name"]'
\`\`\`

\`\`\`python
import json, subprocess

def esql(query, limit=1000):
    out = subprocess.run(["kbn-tool", "esql", "--limit", str(limit), query],
                         capture_output=True, text=True, check=True).stdout
    return [json.loads(line) for line in out.splitlines()]
\`\`\`

For the full tool result, including the query that ran and any warnings, call the tool directly:

\`\`\`bash
kbn-tool call platform.core.execute_esql --params '{"query": "FROM logs-* | LIMIT 5", "time_range": {"from": "now-1h", "to": "now"}}'
\`\`\`

Parameters: \`query\` (required), \`limit\`, \`params\` (named query parameters), \`time_range\`
(\`{from, to}\`, applied through \`?_tstart\` / \`?_tend\` in the query), \`filter\` (Query DSL), and
\`timeout_seconds\`.`;

const getToolSubActions = ({ actionTypeId, selectedActions }: AgentConnector) => {
  const spec = getConnectorSpec(actionTypeId);
  return spec
    ? Object.entries(spec.actions).filter(
        ([name]) => isToolAction(spec, name) && isSelectedActionEnabled(name, selectedActions)
      )
    : [];
};

/** The sub-actions of a connector that `kbn-tool connector` can call. */
export const getCallableSubActionNames = (connector: AgentConnector): string[] =>
  getToolSubActions(connector).map(([name]) => name);

const renderConnectorSection = (connector: AgentConnector): string => {
  const lines = [
    `### ${connector.name} (connector-id: \`${connector.id}\`, type: ${connector.actionTypeId})`,
  ];
  const subActions = getToolSubActions(connector);
  if (subActions.length === 0) {
    lines.push(
      '',
      'No sub-actions of this connector can be called with `kbn-tool`: pass its id as the',
      '`connector_id` of the bash command instead, as /workspace/connectors.md describes.'
    );
    return lines.join('\n');
  }
  for (const [name, action] of subActions) {
    lines.push('', `- \`${name}\`${action.description ? `: ${action.description}` : ''}`);
    try {
      lines.push(`  Params: ${formatSchemaForLlm(action.input)}`);
    } catch {
      // A schema the formatter cannot describe still leaves the sub-action usable.
    }
  }
  return lines.join('\n');
};

/** Renders the guide to `kbn-tool` for the connectors assigned to the agent. */
export const renderKibanaToolsManifest = (connectors: readonly AgentConnector[]): string => {
  const sections = [
    HEADER,
    '',
    '## Connectors',
    '',
    'Always make requests to a connector listed here with `kbn-tool connector`, never with `curl`',
    'and the `connector_id` of the bash command. Sub-actions run in Kibana with the connector',
    'credentials, which keeps every request checked and audited, and works for connectors that have',
    'no sandbox credentials. Add `--format ndjson|json|csv` to print a result with `columns` and',
    '`values`, such as an `esql` sub-action, as rows:',
    '',
    '```bash',
    "kbn-tool connector <connector-id> <sub-action> --params '{...}' [--format csv]",
    '```',
  ];
  if (connectors.length === 0) {
    sections.push('', '*(No connectors are assigned to this agent.)*');
  } else {
    for (const connector of connectors) sections.push('', renderConnectorSection(connector));
  }
  return sections.join('\n') + '\n';
};

/** Lists every connector assigned to the agent, including those without sandbox credentials. */
export const listCallableAgentConnectors = async (
  actionsClient: ActionsClient,
  allowedConnectorIds: readonly string[]
): Promise<AgentConnector[]> => {
  if (allowedConnectorIds.length === 0) return [];
  const allowed = new Set(allowedConnectorIds);
  const all = await actionsClient.getAll({ includeSystemActions: false });
  return all
    .filter(({ id }) => allowed.has(id))
    .map(({ id, name, actionTypeId }) => ({ id, name, actionTypeId }));
};
