/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  getDecisionTreeReinforcementAgentType,
  registerDecisionTreeReinforcementAgentType,
  NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_TYPE_ID,
} from '.';
import { SANDBOX_BASH_TOOL_ID } from '../../tools/sandbox_bash/tool';
import { DECISION_TREE_TOOL_IDS } from '../../tools/decision_tree';

const staticBase = () => {
  const type = getDecisionTreeReinforcementAgentType();
  if (typeof type.baseConfiguration === 'function') {
    throw new Error('expected a static base configuration');
  }
  return type.baseConfiguration;
};

describe('Nightshift decision tree reinforcement agent type', () => {
  it('registers under the reinforcement agent type id', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerDecisionTreeReinforcementAgentType(agentBuilder);

    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ id: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_TYPE_ID })
    );
  });

  // The reinforcement agent is launched by the combined optimize workflow, which is itself
  // the investigator's post-execution hook. If this agent also carried that hook, its round
  // would re-run the optimize workflow, which would launch another reinforcement agent.
  it('does not re-run the investigator post-execution workflow', () => {
    expect(staticBase().post_execution_workflow_ids).toBeUndefined();
  });

  // It runs in its own conversation, so the sandbox is namespaced per conversation and it
  // must hydrate its own workspace rather than reusing the investigator's.
  it('hydrates the trees into its own conversation', () => {
    expect(staticBase().workflow_ids).toEqual(['system-nightshift-decision-tree-hydrate']);
  });

  // It distills from the transcript it is handed, so shell and telemetry access would let it
  // re-investigate instead. Only the file tools and the tree tools.
  it('carries file and tree tools but no shell tool', () => {
    const toolIds = staticBase().tools?.[0]?.tool_ids ?? [];
    expect(toolIds).not.toContain(SANDBOX_BASH_TOOL_ID);
    for (const toolId of DECISION_TREE_TOOL_IDS) {
      expect(toolIds).toContain(toolId);
    }
  });
});
