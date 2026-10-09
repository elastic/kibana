/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `system-nightshift-decision-tree-hydrate` executed for real.
 *
 * This is the reinforcement agent's beforeAgent hook, so the workflow's final output is all
 * `run_before_agent_workflows.ts` consumes from it, and it reads `model_context` only. The
 * writer catches its own failures and reports them in `notification`, so without a compose
 * step closing the graph a degraded tree workspace would reach the agent as no warning at all.
 * `index.test.ts` asserts the YAML shape; this asserts the behaviour, compose included.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID } from '@kbn/workflows/managed';
import { parse } from 'yaml';
import { NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID } from '../server/agents/decision_tree_reinforcement';
import { DECISION_TREE_WORKSPACE_ROOT } from '../server/decision_trees/materialize';
import {
  createNightshiftWorkflowFixture,
  hydrateDecisionTreeWorkspace,
  managedYaml,
  type NightshiftWorkflowFixture,
} from './nightshift_workflow_fixture';

const INCOMPLETE_NOTICE =
  `Materialization of ${DECISION_TREE_WORKSPACE_ROOT.replace(/\/$/, '')}/ encountered an error; ` +
  'its contents may be incomplete or missing.';

const FIRST_EXECUTION_INPUTS = {
  prompt: 'reinforce the checkout tree',
  conversation_id: 'reinforcement-conv-1',
  agent_id: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
  round_execution_index: 0,
};

/** The compose step's output, which is the last step of this workflow and so its output. */
interface ComposeOutput {
  model_context?: string;
  workflow_context: Record<string, unknown>;
}

describe('decision tree hydrate workflow, first execution', () => {
  let fixture: NightshiftWorkflowFixture;

  beforeAll(async () => {
    fixture = createNightshiftWorkflowFixture();
    await fixture.runDecisionTreeHydrate(FIRST_EXECUTION_INPUTS);
  });

  it('completes the workflow execution', () => {
    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
  });

  it('hydrates the trees the reinforcement agent edits', () => {
    expect(fixture.stepOutput<{ tree_count: number }>('hydrate_decision_trees')?.tree_count).toBe(
      3
    );
    expect(hydrateDecisionTreeWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'fake_space_id' })
    );
  });

  // Success must stay silent: an empty notice would tell the reinforcement agent its trees are
  // incomplete on every healthy round.
  it('says nothing to the agent when the trees materialize', () => {
    expect(
      fixture.stepOutput<ComposeOutput>('compose_notifications')?.model_context
    ).toBeUndefined();
  });

  it('reports no recalled memories for a round that recalls none', () => {
    // The reinforcement agent has no after-execution workflow reading the recall list; the
    // envelope exists only because the compose step requires the input.
    expect(fixture.stepOutput<ComposeOutput>('compose_notifications')?.workflow_context).toEqual({
      'nightshift.semantic_memory.recall': { version: 1, data: { recalled_ids: [] } },
    });
  });
});

describe('decision tree hydrate workflow, a tree write that cannot complete', () => {
  it('hands the incomplete-workspace notice to the agent as model context', async () => {
    const fixture = createNightshiftWorkflowFixture();
    jest.mocked(hydrateDecisionTreeWorkspace).mockRejectedValue(new Error('sandbox write refused'));

    await fixture.runDecisionTreeHydrate(FIRST_EXECUTION_INPUTS);

    // The writer must not fail the execution: run_before_agent_workflows.ts throws on a failed
    // execution, which would abort the reinforcement round over one directory.
    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    expect(fixture.stepOutput<{ failed?: boolean }>('hydrate_decision_trees')?.failed).toBe(true);
    expect(fixture.stepOutput<ComposeOutput>('compose_notifications')?.model_context).toBe(
      `<system_update>\n${INCOMPLETE_NOTICE}\n</system_update>`
    );
  });
});

describe('decision tree hydrate workflow, rounds that must not hydrate', () => {
  it.each([
    ['a HITL resume', { ...FIRST_EXECUTION_INPUTS, round_execution_index: 1 }],
    ['no conversation id', { ...FIRST_EXECUTION_INPUTS, conversation_id: undefined }],
  ])('writes nothing and notifies nobody on %s', async (_case, inputs) => {
    const fixture = createNightshiftWorkflowFixture();

    await fixture.runDecisionTreeHydrate(inputs);

    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    expect(fixture.stepExecutions('obtain_sandbox')).toHaveLength(0);
    expect(fixture.stepExecutions('hydrate_decision_trees')).toHaveLength(0);
    expect(fixture.stepExecutions('compose_notifications')).toHaveLength(0);
    expect(hydrateDecisionTreeWorkspace).not.toHaveBeenCalled();
  });
});

describe('decision tree hydrate workflow, the notice the agent can receive', () => {
  // The hook reads only `model_context` off the workflow's final output, so a writer notice
  // composed anywhere but the last step would be dropped. This is the shipped YAML, not a copy.
  it('closes the graph with the compose step that builds that model context', () => {
    const { steps } = parse(managedYaml(NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID)) as {
      steps: Array<{ name: string; type?: string }>;
    };

    expect(steps.at(-1)).toEqual({
      name: 'compose_notifications',
      type: 'nightshift.composeHydrateNotifications',
      if: '${{ steps.obtain_sandbox.output.sandbox_id != null }}',
      with: expect.anything(),
    });
  });
});
