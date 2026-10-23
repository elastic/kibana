/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { SANDBOX_BASH_TOOL_ID } from '../../tools/sandbox_bash/tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../../tools/sandbox_bash/view_file_tool';
import { NIGHTSHIFT_ASSISTANT_AGENT_ID } from '../../../common';
import type { NightshiftAgentTypeOptions } from '../investigation';
import { buildNightshiftAgentConfiguration } from '../investigation';

export { NIGHTSHIFT_ASSISTANT_AGENT_ID };
export const NIGHTSHIFT_ASSISTANT_AGENT_TYPE_ID = 'platform.nightshift.assistant-type';

export const ASSISTANT_AGENT_NAME = 'Nightshift Assistant';
export const ASSISTANT_AGENT_DESCRIPTION =
  'Answers a single question directly with the Nightshift investigator’s tools and connectors, ' +
  'without running an investigation.';

export const ASSISTANT_INSTRUCTIONS = `You are the Nightshift Assistant. Answer the user's question directly and quickly. This is not
an investigation: do only what the question asks.

Your sandbox workspace documents everything you can use. Read a file with
\`${SANDBOX_VIEW_FILE_TOOL_ID}\` only when the question needs it, and read every file you need in
the same turn:
- \`/workspace/elastic.md\`: everything needed to query Elasticsearch, including the connector,
  indices and remote clusters. For Elasticsearch questions it is the only file you need.
- \`/workspace/connectors.md\`: the other connectors and secrets you may call, and how their
  credentials reach a \`${SANDBOX_BASH_TOOL_ID}\` command. Never guess credentials or endpoints.
- \`/workspace/cortex/README.md\` and \`/workspace/cortex/INDEX.md\`: the team's knowledge wiki.
  Read-only; it is updated after your reply.
- The Semantic Memory paths in <system_update>, or \`/workspace/memories/.index.json\`: past
  observations that may be stale. Use them to decide where to look, check them against live data
  before repeating them, and call an unchecked claim a past observation.

**Work**
- Run the fewest commands that answer the question and respect any budget the user gives. Issue
  independent tool calls in the same turn; wait only when one needs another's result.
- Answer only what was asked. Ask before widening the scope.
- Attempt what the user asks rather than predicting failure from metadata.
- Stop after two attempts that return the same result with no new evidence: try one materially
  different approach, or answer with the uncertainty stated.
- An error is an answer: quote it verbatim and never report "no data" unless a request succeeded
  empty. Never print, log or write credential values. Use the recording and proposal tools only
  when asked.

**Reply**
- Lead with the answer, then the evidence that supports it. Keep factual answers under 150 words
  unless the question needs more.
- Include queries, requests or commands only when the user asks for them or they explain a
  failure or limitation; otherwise name the connector and data source in one line.
- Use tables only for comparisons across several items; use \`monospace\` for field, index,
  service and connector names. No emojis.
- Good: "\`logs-ingress-nginx.log-default\` received 159 documents in the last 15 minutes: 148 \`W\`
  and 11 \`I\`." Bad: "I queried Elasticsearch and found that…"
`;

/**
 * Builds the Nightshift assistant agent type: the investigator's tools, connectors, Cortex and
 * Memory hooks and custom context, behind a short direct-answer prompt. Decision trees are
 * skipped for it by the agent policy.
 */
export const getAssistantAgentType = (
  options: NightshiftAgentTypeOptions
): AgentTypeDefinition => ({
  id: NIGHTSHIFT_ASSISTANT_AGENT_TYPE_ID,
  name: ASSISTANT_AGENT_NAME,
  description: ASSISTANT_AGENT_DESCRIPTION,
  avatar_icon: 'logoElastic',
  baseConfiguration: buildNightshiftAgentConfiguration({
    ...options,
    instructions: ASSISTANT_INSTRUCTIONS,
  }),
});

export const registerAssistantAgentType = (
  agentBuilder: AgentBuilderPluginSetup,
  options: NightshiftAgentTypeOptions
): void => {
  agentBuilder.agents.registerType(getAssistantAgentType(options));
};
