/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type {
  AgentBaseConfiguration,
  AgentConfigContext,
  AgentTypeDefinition,
} from '@kbn/agent-builder-server/agents';
import type { Logger } from '@kbn/core/server';
import {
  SET_HYPOTHESES_TOOL_ID,
  SET_IMPACT_TOOL_ID,
} from '@kbn/agentic-investigations-plugin/common';
import {
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../../common';
import instructions from './instructions/investigator.md.text';
import decisionTreesSection from './instructions/decision_trees.text';
import { REPLY_USER_TOOL_ID } from '../../tools/reply_user/tool';
import { TIME_CONVERTER_TOOL_ID } from '../../tools/time_converter/tool';
import { SANDBOX_BASH_TOOL_ID } from '../../tools/sandbox_bash/tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../../tools/sandbox_bash/view_file_tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../../tools/sandbox_bash/write_file_tool';

export { NIGHTSHIFT_INVESTIGATION_AGENT_ID };
export const NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID = 'platform.nightshift.investigation-type';

export const SANDBOX_TOOL_IDS = [
  SANDBOX_BASH_TOOL_ID,
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
] as const;

/** The agentic investigations tools earlier versions of the agent recorded findings with. */
export const INVESTIGATION_TOOL_IDS = [SET_IMPACT_TOOL_ID, SET_HYPOTHESES_TOOL_ID] as const;

export const INVESTIGATION_AGENT_NAME = 'Nightshift Investigator';
export const INVESTIGATION_AGENT_DESCRIPTION =
  'Answers an arbitrary investigation question by reasoning from cluster telemetry it queries ' +
  'inside a sandbox and, when Cortex is enabled, records what it learns in the Nightshift Cortex wiki.';

const SEMANTIC_MEMORY_SECTION = `
**USING MEMORIES**
Memories are observations from past tasks — they help steer your investigation but reflect a point in time and may no longer be current.
- Inspect this turn's Semantic Memory paths from <system_update>, or \`/workspace/memories/.index.json\` when present.
- Independently verify memory claims against live connector APIs before including them in your reply.
- Use them to guide where you look, but confirm the details are still accurate.
- When you cannot confirm a memory claim, note it as a past observation (e.g. 'previously observed that…') so the user knows it needs confirmation.
- Pay attention to memory age — old memories are more likely to be stale.
`;

const fillContextInstructions = ({
  includeDecisionTrees,
  includeMemory,
}: {
  includeDecisionTrees: boolean;
  includeMemory: boolean;
}): string =>
  instructions
    .replace('{{semantic_memory_section}}', includeMemory ? SEMANTIC_MEMORY_SECTION : '')
    .replace(
      '{{decision_trees_section}}',
      includeDecisionTrees ? `${decisionTreesSection.trimEnd()}\n` : ''
    );

interface InvestigationAgentTypeOptions {
  sandboxEnabled: boolean;
  cortexEnabled: boolean;
  memoryEnabled?: boolean;
  decisionTreesEnabled?: boolean;
  telemetryConnectorId?: string;
  /** Resolves the space's custom context block, appended to the instructions on every run. */
  getCustomContextInstructions?: (ctx: AgentConfigContext) => Promise<string>;
  logger?: Logger;
}

const appendCustomContext = async ({
  instructions: baseInstructions,
  ctx,
  getCustomContextInstructions,
  logger,
}: {
  instructions: string;
  ctx: AgentConfigContext;
  getCustomContextInstructions: (ctx: AgentConfigContext) => Promise<string>;
  logger?: Logger;
}): Promise<string> => {
  try {
    const customContext = await getCustomContextInstructions(ctx);
    return customContext ? `${baseInstructions.trimEnd()}\n\n${customContext}\n` : baseInstructions;
  } catch (error) {
    // Custom context only refines the prompt, so failing to read it must not block a run.
    logger?.warn(`Failed to load custom context for space "${ctx.spaceId}": ${error.message}`);
    return baseInstructions;
  }
};

/**
 * Builds the Nightshift investigation agent type. It works from the sandbox, so it carries a
 * standalone prompt, the sandbox tools, `time_converter_tool` and `reply_user`. Telemetry is reached through `telemetryConnectorId` as
 * described in `/workspace/elastic.md`.
 */
export const getInvestigationAgentType = ({
  sandboxEnabled,
  cortexEnabled,
  memoryEnabled = false,
  decisionTreesEnabled = false,
  telemetryConnectorId,
  getCustomContextInstructions,
  logger,
}: InvestigationAgentTypeOptions): AgentTypeDefinition => {
  const baseConfiguration = {
    instructions: fillContextInstructions({
      includeDecisionTrees: sandboxEnabled && decisionTreesEnabled,
      includeMemory: sandboxEnabled && memoryEnabled,
    }),
    skill_ids: [],
    tools: [
      {
        tool_ids: [
          ...(sandboxEnabled ? [...SANDBOX_TOOL_IDS] : []),
          TIME_CONVERTER_TOOL_ID,
          REPLY_USER_TOOL_ID,
        ],
      },
    ],
    enable_elastic_capabilities: false,
    // Only the tools listed above: none of Agent Builder's internal file, API, todo or metadata tools.
    disable_internal_tools: true,
    // The investigator's own prompt, without Agent Builder's generic system prompt around it.
    raw_system_prompt: true,
    connector_ids: telemetryConnectorId ? [telemetryConnectorId] : [],
    ...(() => {
      // Decision trees are no longer a separate before-agent hook: they hydrate as a third
      // parallel branch of the combined materialize workflow, which already carries the
      // sandbox_id they need. The reinforcement agent keeps its own hydrate workflow because
      // it runs in a different conversation. `decisionTreesEnabled` implies `cortexEnabled`,
      // so it adds nothing to either gate below.
      const beforeAgentWorkflowIds =
        sandboxEnabled && (cortexEnabled || memoryEnabled)
          ? [NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID]
          : [];
      return beforeAgentWorkflowIds.length ? { workflow_ids: beforeAgentWorkflowIds } : {};
    })(),
    // One post-hook. Decision-tree reinforcement is the tail phase of the combined optimize
    // workflow, so listing the reinforce workflow here as well would reinforce every round
    // twice — two ai.agent runs, up to 900s each, writing the same trees.
    ...(cortexEnabled || memoryEnabled
      ? { post_execution_workflow_ids: [NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID] }
      : {}),
  } satisfies AgentBaseConfiguration;

  return {
    id: NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
    name: INVESTIGATION_AGENT_NAME,
    description: INVESTIGATION_AGENT_DESCRIPTION,
    avatar_icon: 'logoElastic',
    baseConfiguration: getCustomContextInstructions
      ? async (ctx) => ({
          ...baseConfiguration,
          instructions: await appendCustomContext({
            instructions: baseConfiguration.instructions,
            ctx,
            getCustomContextInstructions,
            logger,
          }),
        })
      : baseConfiguration,
  };
};

export const registerInvestigationAgentType = (
  agentBuilder: AgentBuilderPluginSetup,
  {
    sandboxEnabled,
    cortexEnabled,
    memoryEnabled = false,
    decisionTreesEnabled = false,
    telemetryConnectorId,
    getCustomContextInstructions,
    logger,
  }: InvestigationAgentTypeOptions
): void => {
  agentBuilder.agents.registerType(
    getInvestigationAgentType({
      sandboxEnabled,
      cortexEnabled,
      memoryEnabled,
      decisionTreesEnabled,
      telemetryConnectorId,
      getCustomContextInstructions,
      logger,
    })
  );
};
