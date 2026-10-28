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
import {
  DECISION_TREE_LEARNING_TOOL_IDS,
  DECISION_TREE_SUBMIT_TOOL_ID,
} from '../../tools/decision_tree';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../../tools/sandbox_bash/view_file_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../../tools/sandbox_bash/write_file_tool';

const baseFor = async (spaceId = 'default') => {
  const type = getDecisionTreeReinforcementAgentType();
  if (typeof type.baseConfiguration !== 'function') {
    throw new Error('expected a per-space base configuration');
  }
  return type.baseConfiguration({ spaceId } as never);
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
  it('does not re-run the investigator post-execution workflow', async () => {
    expect((await baseFor()).post_execution_workflow_ids).toBeUndefined();
  });

  // It runs in its own conversation, so the sandbox is namespaced per conversation and it
  // must hydrate its own workspace rather than reusing the investigator's.
  it('hydrates the trees into its own conversation', async () => {
    expect((await baseFor()).workflow_ids).toEqual([
      'system-nightshift-decision-tree-hydrate-bound-default',
    ]);
  });

  // It distills from the transcript it is handed, so shell and telemetry access would let it
  // re-investigate instead. Only the file tools and submit; the learning tools are added per
  // turn, on follow-up turns only, as Deductive does.
  it('carries the file tools and submit, but no shell or learning tool', async () => {
    const toolIds = (await baseFor()).tools?.[0]?.tool_ids ?? [];
    expect([...toolIds].sort()).toEqual(
      [
        SANDBOX_VIEW_FILE_TOOL_ID,
        SANDBOX_STR_REPLACE_TOOL_ID,
        SANDBOX_WRITE_FILE_TOOL_ID,
        DECISION_TREE_SUBMIT_TOOL_ID,
      ].sort()
    );
    expect(toolIds).not.toContain(SANDBOX_BASH_TOOL_ID);
    for (const toolId of DECISION_TREE_LEARNING_TOOL_IDS) {
      expect(toolIds).not.toContain(toolId);
    }
  });

  it("hydrates through the space's bound hook entry point", async () => {
    const base = await baseFor('sa-a');
    expect(base.workflow_ids).toEqual(['system-nightshift-decision-tree-hydrate-bound-sa-a']);
  });
});
