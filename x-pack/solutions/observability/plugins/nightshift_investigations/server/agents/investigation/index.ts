/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import {
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_DECISION_TREE_REINFORCE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import instructions from './instructions/investigator.md.text';
import decisionTreesSection from './instructions/decision_trees.text';
import { SANDBOX_BASH_TOOL_ID } from '../../tools/sandbox_bash/tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../../tools/sandbox_bash/view_file_tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../../tools/sandbox_bash/write_file_tool';

export const NIGHTSHIFT_INVESTIGATION_AGENT_ID = 'nightshift.investigation';
export const NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID = 'platform.nightshift.investigation-type';

const SANDBOX_TOOL_IDS = [
  SANDBOX_BASH_TOOL_ID,
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
] as const;

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
  telemetryConnectorId?: string;
}

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
  telemetryConnectorId,
}: InvestigationAgentTypeOptions): AgentTypeDefinition => ({
  id: NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
  name: INVESTIGATION_AGENT_NAME,
  description: INVESTIGATION_AGENT_DESCRIPTION,
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions: fillContextInstructions({
      includeDecisionTrees: sandboxEnabled && decisionTreesEnabled,
      includeMemory: sandboxEnabled && memoryEnabled,
    }),
    skill_ids: [],
    tools: [
      {
        tool_ids: [
          platformSignificantEventsTools.reportInvestigationProgress,
          ...(sandboxEnabled ? [...SANDBOX_TOOL_IDS] : []),
        ],
      },
    ],
    enable_elastic_capabilities: false,
    connector_ids: telemetryConnectorId ? [telemetryConnectorId] : [],
    ...(() => {
      const beforeAgentWorkflowIds = [
        ...(sandboxEnabled && (cortexEnabled || memoryEnabled)
          ? [NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID]
          : []),
        ...(sandboxEnabled && decisionTreesEnabled
          ? [NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID]
          : []),
      ];
      return beforeAgentWorkflowIds.length ? { workflow_ids: beforeAgentWorkflowIds } : {};
    })(),
    ...(cortexEnabled || memoryEnabled || decisionTreesEnabled
      ? {
          post_execution_workflow_ids: [
            ...(cortexEnabled || memoryEnabled ? [NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID] : []),
            ...(decisionTreesEnabled ? [NIGHTSHIFT_DECISION_TREE_REINFORCE_WORKFLOW_ID] : []),
          ],
        }
      : {}),
  },
});

export const registerInvestigationAgentType = (
  agentBuilder: AgentBuilderPluginSetup,
  {
    sandboxEnabled,
    cortexEnabled,
    memoryEnabled = false,
    decisionTreesEnabled = false,
    telemetryConnectorId,
  }: InvestigationAgentTypeOptions
): void => {
  agentBuilder.agents.registerType(
    getInvestigationAgentType({
      sandboxEnabled,
      cortexEnabled,
      memoryEnabled,
      decisionTreesEnabled,
      telemetryConnectorId,
    })
  );
};
