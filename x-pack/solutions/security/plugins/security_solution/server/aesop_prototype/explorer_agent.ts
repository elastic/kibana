/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode, platformCoreTools } from '@kbn/agent-builder-common';
import { contextEngineAiIndexTools } from '@kbn/agent-builder-common/tools';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { AESOP_EXPLORER_AGENT_ID, AESOP_EXPLORER_SKILL_ID } from '../../common/aesop_prototype';

export const AESOP_EXPLORER_AGENT_TYPE_ID = 'security.aesop-explorer-type';

/** Read-only tools: ES|QL over traces, index discovery/search, and the AI-index readers. */
const EXPLORER_TOOL_IDS = [
  platformCoreTools.executeEsql,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.search,
  platformCoreTools.indexExplorer,
  contextEngineAiIndexTools.listAiIndices,
  contextEngineAiIndexTools.describeAiIndex,
  contextEngineAiIndexTools.queryAiIndices,
];

/** The AI index holding AESOP findings, rejections and dismissals. */
const EXPLORER_AI_INDICES = ['aesop'];

/** AESOP prototype explorer: discovery mode proposes new skills, telemetry mode proposes variants. */
export const aesopExplorerAgentType = {
  id: AESOP_EXPLORER_AGENT_TYPE_ID,
  name: 'AESOP Skill Explorer',
  description:
    'Read-only agent that proposes skill candidates. Discovery mode searches security data for recurring analyst work no skill covers; telemetry mode summarizes skill-usage traces (invocations, tool patterns, failure rates, trace ids) to ground variants of existing skills.',
  avatar_icon: 'logoSecurity',
  baseConfiguration: {
    instructions: `# AESOP Skill Explorer (prototype)

You find skill candidates, in one of two modes named in the request:
- discovery: search security data (list_indices, get_index_mapping, search,
  index_explorer, execute_esql) for recurring analyst work that no existing
  skill covers, and propose new skills.
- telemetry: read Agent Builder traces for existing skills and propose
  variants grounded in observed usage.

Always start by reading the aesop AI index (list_ai_indices, then
query_ai_indices): earlier findings, rejections and dismissals. Never
re-propose something already rejected or dismissed.

Work through the aesop-skill-explorer skill: it holds the query patterns.
Report trace ids and document ids verbatim as evidence.

You are read-only. You have no write tools. If asked to change a skill,
explain that skill changes go through the AESOP A/B workflow (a proposal
the analyst approves), and offer to pull the evidence that would ground
such a change.`,
    skill_ids: [AESOP_EXPLORER_SKILL_ID],
    enable_elastic_capabilities: false,
    connector_ids: [],
    ai_indices: EXPLORER_AI_INDICES,
    tools: [
      {
        tool_ids: EXPLORER_TOOL_IDS,
      },
    ],
  },
} as const satisfies AgentTypeDefinition;

export const registerAesopExplorerAgentType = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.registerType(aesopExplorerAgentType);
};

/**
 * Installs the system-owned, user-editable explorer agent in a space (the default space at
 * boot, the request's space from the explorer route). Idempotent — does not overwrite existing
 * agents or later user edits.
 */
export const installAesopExplorerAgent = async ({
  agentBuilder,
  spaceId,
}: {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
}): Promise<void> => {
  await agentBuilder.agents.ensure({
    spaceId,
    agent: {
      id: AESOP_EXPLORER_AGENT_ID,
      type: AESOP_EXPLORER_AGENT_TYPE_ID,
      name: 'AESOP Skill Explorer',
      description: aesopExplorerAgentType.description,
      labels: ['security', 'aesop_prototype'],
      avatar_symbol: 'AE',
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [
          {
            tool_ids: EXPLORER_TOOL_IDS,
          },
        ],
        skill_ids: [AESOP_EXPLORER_SKILL_ID],
        connector_ids: [],
        ai_indices: EXPLORER_AI_INDICES,
      },
    },
  });
};
