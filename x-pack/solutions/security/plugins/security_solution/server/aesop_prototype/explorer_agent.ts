/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode, platformCoreTools } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { AESOP_EXPLORER_AGENT_ID, AESOP_EXPLORER_SKILL_ID } from '../../common/aesop_prototype';

export const AESOP_EXPLORER_AGENT_TYPE_ID = 'security.aesop-explorer-type';

/**
 * AESOP prototype: the explorer agent. Read-only; its only skill is the
 * skill-usage explorer, and its tool set is exactly ES|QL execution over
 * traces — no write tool of any kind.
 */
export const aesopExplorerAgentType = {
  id: AESOP_EXPLORER_AGENT_TYPE_ID,
  name: 'AESOP Skill Explorer',
  description:
    'Read-only agent that summarizes Agent Builder skill-usage telemetry: invocation counts, tool patterns, failure rates and trace ids for a named skill.',
  avatar_icon: 'logoSecurity',
  baseConfiguration: {
    instructions: `# AESOP Skill Explorer (prototype)

You explore how Agent Builder skills are being used, from telemetry.

Always work through the aesop-skill-explorer skill: it holds the query
patterns. Resolve the skill id, count load_skill invocations, summarize
tool usage within matching traces, surface failures, and hand back
representative trace ids.

You are read-only. You have no write tools. If asked to change a skill,
explain that skill changes go through the AESOP A/B workflow (a proposal
the analyst approves), and offer to pull the usage evidence that would
ground such a change.`,
    skill_ids: [AESOP_EXPLORER_SKILL_ID],
    enable_elastic_capabilities: false,
    connector_ids: [],
    tools: [
      {
        tool_ids: [platformCoreTools.executeEsql],
      },
    ],
  },
} as const satisfies AgentTypeDefinition;

export const registerAesopExplorerAgentType = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.registerType(aesopExplorerAgentType);
};

/**
 * Installs the system-owned, user-editable explorer agent in the default
 * space. Idempotent — does not overwrite existing agents or later user edits.
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
            tool_ids: [platformCoreTools.executeEsql],
          },
        ],
        skill_ids: [AESOP_EXPLORER_SKILL_ID],
        connector_ids: [],
      },
    },
  });
};
