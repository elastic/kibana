/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectorSpec, isSelectedActionEnabled, isToolAction } from '@kbn/connector-specs';
import type { AgentConnector, ActionsClient } from './agent_connectors';

const HEADER = `# Calling Kibana from the sandbox

Write Python and call Kibana through the generated \`kibana_sdk\` module. Each call runs in Kibana
as the user of this conversation, with the connector's credentials (they never enter the sandbox),
and returns parsed data. Results with \`columns\` and \`values\`, such as ES|QL, come back as a list of
row dicts. A refused or failed call raises \`KibanaError\` with the reason.

\`\`\`python
import sys; sys.path.insert(0, "/workspace")
from kibana_sdk import kibana
kibana.search_tools("error rate by service")   # find what to call; prints path and description
kibana.search_tools("mapping", detail="full")  # signature and every parameter of the matches
es = kibana.connectors["<connector-id>"]       # an id from /workspace/connectors.md
rows = es.esql(query="FROM logs-* | STATS errors = COUNT(*) BY service.name | SORT errors DESC")
\`\`\`

Nothing is printed unless you print it: loop over many calls in one script (up to 8 run at a time),
join and aggregate in Python, and print only what you need to read. A result is limited to 2 MiB:
ask for fewer rows or fields when a call reports it is too large.

\`kibana.esql(query)\` runs ES|QL on the cluster behind this Kibana, not on a cluster an
Elasticsearch connector points at: for a connector's cluster use its \`esql\` sub-action.
\`kibana.call(tool_id, **params)\` runs a Kibana tool by its id; \`kibana.tools.<name>(...)\` is the
same with typed parameters.

The module wraps the \`kbn-tool\` CLI, which also works from shell when you do not need Python:

\`\`\`text
kbn-tool esql [--limit N] [--format ndjson|json|csv] '<ES|QL query>'
kbn-tool call <tool-id> --params '<json object>'        # or --params - to read stdin
kbn-tool connector <connector-id> <sub-action> --params '<json object>' [--format ndjson|json|csv]
\`\`\`

Exit code 1: Kibana refused or failed the call; the reason is on stderr. Exit code 2: wrong usage,
or the command was started without Kibana callbacks.`;

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
    // Only the name and first line: \`kibana.search_tools\` explains the parameters on demand.
    const summary = action.description?.split(/(?<=[.!?])\s/)[0];
    lines.push('', `- \`${name}\`${summary ? `: ${summary}` : ''}`);
  }
  return lines.join('\n');
};

/** Renders the guide to `kbn-tool` for the connectors assigned to the agent. */
export const renderKibanaToolsManifest = (
  connectors: readonly AgentConnector[],
  toolIds: readonly string[] = []
): string => {
  const sections = [
    HEADER,
    '',
    '## Connectors',
    '',
    'Always make requests to a connector listed here from Python, with',
    '`kibana.connectors["<connector-id>"].<sub_action>(...)`, never with `curl` and the',
    '`connector_id` of the bash command. Sub-actions run in Kibana with the connector credentials,',
    'which keeps every request checked and audited, and works for connectors that have no sandbox',
    'credentials. The sub-actions below are listed by name; `kibana.search_tools()` shows their',
    'parameters.',
  ];
  if (connectors.length === 0) {
    sections.push('', '*(No connectors are assigned to this agent.)*');
  } else {
    for (const connector of connectors) sections.push('', renderConnectorSection(connector));
  }
  if (toolIds.length > 0) {
    sections.push(
      '',
      '## Kibana tools',
      '',
      'Read-only Kibana tools a script can call with `kibana.tools.<name>(...)` or',
      '`kibana.call("<tool-id>", ...)`. Use `kibana.search_tools("<what you need>")` to see their',
      'parameters.',
      '',
      ...toolIds.map((id) => `- \`${id}\``)
    );
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
    .map(({ id, name, actionTypeId, config }) => ({
      id,
      name,
      actionTypeId,
      selectedActions: config?.selectedActions as AgentConnector['selectedActions'],
    }));
};
