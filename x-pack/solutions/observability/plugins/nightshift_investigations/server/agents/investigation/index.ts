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
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  SET_HYPOTHESES_TOOL_ID,
  SET_IMPACT_TOOL_ID,
} from '@kbn/agentic-investigations-plugin/common';
import { PROPOSALS_CREATE_TOOL_ID } from '@kbn/proposals-common';
import {
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../../common';
import instructions from './instructions/investigator.md.text';
import decisionTreesSection from './instructions/decision_trees.text';
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

/**
 * The agentic investigations tools the agent records its findings with.
 * `set_conversation_metadata` (summary, verdict, severity) is not listed: Agent Builder adds it to
 * every run on a template conversation, which every investigation is.
 */
export const INVESTIGATION_TOOL_IDS = [SET_IMPACT_TOOL_ID, SET_HYPOTHESES_TOOL_ID] as const;

export const INVESTIGATION_AGENT_NAME = 'Nightshift Investigator';
export const INVESTIGATION_AGENT_DESCRIPTION =
  'Answers an arbitrary investigation question by reasoning from cluster telemetry it queries ' +
  'inside a sandbox and, when Cortex is enabled, records what it learns in the Nightshift Cortex wiki.';

/** Interpolated only when hydrate will actually write `/workspace/decision-trees/`. */
const DECISION_TREES_LOAD_STEP =
  ' Also check `/workspace/decision-trees/monitors.md` for a prior decision tree matching this symptom — see <decision_trees>.';

const SEMANTIC_MEMORY_LOAD_STEP = ` Also inspect this turn's Semantic Memory paths from
<system_update>, or /workspace/memories/.index.json when present. Treat memories as historical
observations and verify them against current telemetry before relying on them.`;

const fillContextInstructions = ({
  includeDecisionTrees,
  includeMemory,
}: {
  includeDecisionTrees: boolean;
  includeMemory: boolean;
}): string =>
  instructions
    .replace('{{decision_trees_load_step}}', includeDecisionTrees ? DECISION_TREES_LOAD_STEP : '')
    .replace('{{semantic_memory_load_step}}', includeMemory ? SEMANTIC_MEMORY_LOAD_STEP : '')
    .replace(
      '{{decision_trees_section}}',
      includeDecisionTrees ? `\n${decisionTreesSection.trimEnd()}\n` : ''
    );

interface InvestigationAgentTypeOptions {
  sandboxEnabled: boolean;
  cortexEnabled: boolean;
  memoryEnabled?: boolean;
  decisionTreesEnabled?: boolean;
  /** The agentic investigations plugin is enabled, so its tools are registered. */
  investigationToolsEnabled: boolean;
  /** The proposals plugin is enabled, so `proposals.create` is registered. */
  proposalsEnabled: boolean;
  telemetryConnectorId?: string;
  /** Resolves the space's custom context block, appended to the instructions on every run. */
  getCustomContextInstructions?: (ctx: AgentConfigContext) => Promise<string>;
  /**
   * The id of the workflow the agent runs for a hook in a space. A space set up with the Nightshift
   * service account runs its hooks through entry points bound to that account; without one, the
   * global hook runs as whoever runs the agent.
   */
  resolveHookWorkflowId?: (hookWorkflowId: string, spaceId: string) => string;
  logger?: Logger;
}

const identity = (hookWorkflowId: string): string => hookWorkflowId;

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
 * standalone prompt and no Elastic tools. Telemetry is reached through `telemetryConnectorId` as
 * described in `/workspace/elastic.md`.
 */
export const getInvestigationAgentType = ({
  sandboxEnabled,
  cortexEnabled,
  memoryEnabled = false,
  decisionTreesEnabled = false,
  investigationToolsEnabled,
  proposalsEnabled,
  telemetryConnectorId,
  getCustomContextInstructions,
  resolveHookWorkflowId,
  logger,
}: InvestigationAgentTypeOptions): AgentTypeDefinition => {
  const resolveHook = resolveHookWorkflowId ?? identity;
  const getBaseConfiguration = (spaceId: string) =>
    ({
      instructions: fillContextInstructions({
        includeDecisionTrees: sandboxEnabled && decisionTreesEnabled,
        includeMemory: sandboxEnabled && memoryEnabled,
      }),
      skill_ids: [],
      tools: [
        {
          tool_ids: [
            ...(investigationToolsEnabled ? [...INVESTIGATION_TOOL_IDS] : []),
            ...(proposalsEnabled ? [PROPOSALS_CREATE_TOOL_ID] : []),
            ...(sandboxEnabled ? [...SANDBOX_TOOL_IDS] : []),
          ],
        },
      ],
      enable_elastic_capabilities: false,
      connector_ids: telemetryConnectorId ? [telemetryConnectorId] : [],
      ...(() => {
        // Decision trees are no longer a separate before-agent hook: they hydrate as a third
        // parallel branch of the combined materialize workflow, which already carries the
        // sandbox_id they need. The reinforcement agent keeps its own hydrate workflow because
        // it runs in a different conversation. `decisionTreesEnabled` implies `cortexEnabled`,
        // so it adds nothing to either gate below.
        const beforeAgentWorkflowIds =
          sandboxEnabled && (cortexEnabled || memoryEnabled)
            ? [resolveHook(NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID, spaceId)]
            : [];
        return beforeAgentWorkflowIds.length ? { workflow_ids: beforeAgentWorkflowIds } : {};
      })(),
      // One post-hook. Decision-tree reinforcement is the tail phase of the combined optimize
      // workflow, so listing the reinforce workflow here as well would reinforce every round
      // twice — two ai.agent runs, up to 900s each, writing the same trees.
      ...(cortexEnabled || memoryEnabled
        ? {
            post_execution_workflow_ids: [
              resolveHook(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID, spaceId),
            ],
          }
        : {}),
    } satisfies AgentBaseConfiguration);

  return {
    id: NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
    name: INVESTIGATION_AGENT_NAME,
    description: INVESTIGATION_AGENT_DESCRIPTION,
    avatar_icon: 'logoElastic',
    // Static unless something varies by space or request.
    baseConfiguration:
      !getCustomContextInstructions && !resolveHookWorkflowId
        ? getBaseConfiguration(DEFAULT_SPACE_ID)
        : async (ctx) => {
            const baseConfiguration = getBaseConfiguration(ctx.spaceId);
            return getCustomContextInstructions
              ? {
                  ...baseConfiguration,
                  instructions: await appendCustomContext({
                    instructions: baseConfiguration.instructions,
                    ctx,
                    getCustomContextInstructions,
                    logger,
                  }),
                }
              : baseConfiguration;
          },
  };
};

export const registerInvestigationAgentType = (
  agentBuilder: AgentBuilderPluginSetup,
  {
    sandboxEnabled,
    cortexEnabled,
    memoryEnabled = false,
    decisionTreesEnabled = false,
    investigationToolsEnabled,
    proposalsEnabled,
    telemetryConnectorId,
    getCustomContextInstructions,
    resolveHookWorkflowId,
    logger,
  }: InvestigationAgentTypeOptions
): void => {
  agentBuilder.agents.registerType(
    getInvestigationAgentType({
      sandboxEnabled,
      cortexEnabled,
      memoryEnabled,
      decisionTreesEnabled,
      investigationToolsEnabled,
      proposalsEnabled,
      telemetryConnectorId,
      getCustomContextInstructions,
      resolveHookWorkflowId,
      logger,
    })
  );
};
