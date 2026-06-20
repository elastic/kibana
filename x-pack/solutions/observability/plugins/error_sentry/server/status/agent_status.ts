/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { ERROR_SENTRY_AGENT_ID } from '../../common/constants';
import type { ComponentStatus } from '../../common/constants';
import { SCS_TOOL_IDS, detectiveRalphCreateRequest } from '../agent/detective_ralph';

const EXPECTED_TOOL_IDS = new Set<string>(SCS_TOOL_IDS);
const EXPECTED_INSTRUCTIONS = detectiveRalphCreateRequest.configuration.instructions;

const hasExpectedTools = (toolSelections: Array<{ tool_ids: string[] }>): boolean => {
  const actual = new Set(toolSelections.flatMap((s) => s.tool_ids));
  if (actual.size !== EXPECTED_TOOL_IDS.size) return false;
  for (const id of EXPECTED_TOOL_IDS) {
    if (!actual.has(id)) return false;
  }
  return true;
};

export const getAgentStatus = async (
  agentBuilder: AgentBuilderPluginStart | undefined,
  request: KibanaRequest
): Promise<ComponentStatus> => {
  if (!agentBuilder) {
    return {
      id: 'agent_ralph',
      label: 'Detective Ralph agent',
      state: 'unavailable',
      detail: 'Agent Builder plugin is not available.',
      repairable: false,
    };
  }

  const registry = await agentBuilder.agents.getRegistry({ request });
  const exists = await registry.has(ERROR_SENTRY_AGENT_ID);

  if (!exists) {
    return {
      id: 'agent_ralph',
      label: 'Detective Ralph agent',
      state: 'missing',
      detail: 'Detective Ralph agent is not installed. Click Install or Repair to create it.',
      repairable: true,
    };
  }

  const ralph = await registry.get(ERROR_SENTRY_AGENT_ID);
  const toolsCorrect = hasExpectedTools(ralph.configuration.tools);
  const instructionsCorrect = ralph.configuration.instructions === EXPECTED_INSTRUCTIONS;

  if (!toolsCorrect || !instructionsCorrect) {
    const what = [
      ...(!toolsCorrect ? ['tool configuration'] : []),
      ...(!instructionsCorrect ? ['instructions'] : []),
    ].join(' and ');
    return {
      id: 'agent_ralph',
      label: 'Detective Ralph agent',
      state: 'drifted',
      detail: `Detective Ralph is installed but its ${what} has changed. Repair to restore the expected configuration.`,
      repairable: true,
    };
  }

  return {
    id: 'agent_ralph',
    label: 'Detective Ralph agent',
    state: 'ok',
    repairable: false,
    actionLink: `/app/agent_builder/manage/agents/${ERROR_SENTRY_AGENT_ID}`,
  };
};
