/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `system-nightshift-agent-optimize` executed for real.
 *
 * This workflow carries two very different budgets: the Cortex and Memory optimizers, which
 * Agent Builder runs as a non-blocking post-round hook, and a decision-tree reinforcement agent
 * that runs for up to 900s in its own conversation. Merging them only works if the first two
 * really do run together and really do finish before the third starts, so the ordering, the skip
 * rules, and what a failure does to the reported round are asserted here rather than read off
 * the YAML.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../server/agents/investigation';
import { NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID } from '../server/agents/decision_tree_reinforcement';
import {
  createNightshiftWorkflowFixture,
  memoryOptimizeSummary,
  prepareReinforcementTurn,
  runCortexOptimize,
  runMemoryOptimize,
  type NightshiftWorkflowFixture,
} from './nightshift_workflow_fixture';

const TOOL_CALLS = [
  { tool_id: 'platform_core.esql_query', tool_call_id: 'call-1', params: { query: 'FROM logs' } },
  { tool_id: 'xpack.sandbox.view_file', tool_call_id: 'call-2', params: { path: '/workspace' } },
];

const TOOL_RESULTS = [{ tool_call_id: 'call-1', results: [{ hits: 3 }] }];

const ELIGIBLE_ROUND_INPUTS = {
  prompt: 'why is checkout slow?',
  response: 'the connection pool was exhausted',
  conversation_id: 'conv-1',
  round_id: 'round-1',
  agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
  tool_calls: TOOL_CALLS,
  tool_results: TOOL_RESULTS,
  // What the materialize workflow persisted for this round, forwarded by Agent Builder.
  workflow_context: {
    'nightshift.semantic_memory.recall': { version: 1, data: { recalled_ids: ['mem-1', 'mem-2'] } },
  },
};

describe('agent optimize workflow, an eligible investigator round', () => {
  let fixture: NightshiftWorkflowFixture;
  let memoryRanWhileCortexWasStillGoing: boolean;

  beforeAll(async () => {
    fixture = createNightshiftWorkflowFixture();
    memoryRanWhileCortexWasStillGoing = false;
    let cortexFinished = false;
    jest.mocked(runCortexOptimize).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      cortexFinished = true;
    });
    jest.mocked(runMemoryOptimize).mockImplementation(async () => {
      memoryRanWhileCortexWasStillGoing = cortexFinished === false;
      return memoryOptimizeSummary;
    });

    await fixture.runOptimize(ELIGIBLE_ROUND_INPUTS);
  });

  it('completes the workflow execution', () => {
    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
  });

  // The engine freezes each step's budget in its own timeout zone at entry. If reinforcement had
  // been folded into the parallel it would read 120s here and every long run would be killed.
  it('keeps the reinforcement budget separate from the optimizer budget', () => {
    expect(fixture.resolvedStepTimeout('optimize_workspaces')).toBe('150s');
    expect(fixture.resolvedStepTimeout('reinforce_decision_trees')).toBe('900s');
  });

  // `mode: settled` starts them together; running them one after the other would double the
  // latency of a hook the investigation is already waiting on.
  it('runs the two optimizers concurrently', () => {
    expect(memoryRanWhileCortexWasStillGoing).toBe(true);
  });

  // A third branch would inherit the 120s `branch-timeout` and kill every long reinforcement run,
  // so the tail has to come after the parallel has finished, not inside it.
  it('runs the reinforcement tail only after both optimizers finished', () => {
    const cortexEnd = jest.mocked(runCortexOptimize).mock.invocationCallOrder.at(-1)!;
    const memoryEnd = jest.mocked(runMemoryOptimize).mock.invocationCallOrder.at(-1)!;
    const prepareStart = jest.mocked(prepareReinforcementTurn).mock.invocationCallOrder[0];

    expect(Math.max(cortexEnd, memoryEnd)).toBeLessThan(prepareStart);
  });

  it('runs prepare, ensure and the agent in that order', () => {
    expect([
      ...fixture.stepExecutions('prepare_turn').map((step) => step.stepId),
      ...fixture.stepExecutions('ensure_reinforcement_agent').map((step) => step.stepId),
      ...fixture.agentRuns.map((run) => run.stepId),
    ]).toEqual(['prepare_turn', 'ensure_reinforcement_agent', 'reinforce_decision_trees']);
  });

  it('installs the reinforcement agent before running it', () => {
    expect(fixture.agentBuilder.ensure).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'fake_space_id',
        agent: expect.objectContaining({
          id: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
        }),
      })
    );
  });

  // The agent runs in its own conversation: its own beforeAgent hook hydrates the trees into
  // that conversation's sandbox, and the attribution ids are what the connector bills against.
  it('hands the prepared turn to the reinforcement agent in a new conversation', () => {
    expect(fixture.agentRuns).toEqual([
      {
        stepId: 'reinforce_decision_trees',
        message: 'reinforcement turn prompt',
        config: expect.objectContaining({
          'agent-id': NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
          'create-conversation': true,
          'connector-id-by-feature': 'significant_events_investigation',
          'plugin-id': 'significant_events_decision_tree_reinforce',
          'aggregate-by': 'significant_events',
          'product-solution': 'observability',
          'product-feature': 'nightshift',
        }),
      },
    ]);
  });

  // `${{ }}` keeps an array; Liquid `{{ }}` would stringify it to "[object Object]" and the
  // bounded Zod preprocess would fall back to [], so reinforcement would re-read every tree.
  it('passes the round tool calls through as an array', () => {
    for (const call of [runCortexOptimize, runMemoryOptimize, prepareReinforcementTurn]) {
      expect(jest.mocked(call).mock.calls[0][0]).toMatchObject({ toolCalls: TOOL_CALLS });
    }
  });

  it('attaches the tool results the optimizers read', () => {
    expect(jest.mocked(runMemoryOptimize).mock.calls[0][0]).toMatchObject({
      toolCalls: [{ tool_call_id: 'call-1', results: [{ hits: 3 }] }, TOOL_CALLS[1]],
    });
  });

  // The ids the materialize workflow recalled, round-tripped through workflow_context.
  it('hands the recalled memory ids to the memory optimizer', () => {
    expect(jest.mocked(runMemoryOptimize).mock.calls[0][0]).toMatchObject({
      recalledIds: ['mem-1', 'mem-2'],
    });
  });
});

describe('agent optimize workflow, rounds that must not reinforce', () => {
  // `prepare_turn` is the eligibility gate: it answers `skipped`, and both agent steps read that
  // answer. The workflow still installs with Cortex or Memory alone, so this runs on installs that
  // have no decision trees at all.
  it.each([
    ['the decision-tree feature is off', { decisionTreesEnabled: false }],
    ['the round came from another agent', { decisionTreesEnabled: true }],
  ])('skips the whole reinforcement tail when %s', async (_case, options) => {
    const fixture = createNightshiftWorkflowFixture(options);
    const inputs =
      options.decisionTreesEnabled === false
        ? ELIGIBLE_ROUND_INPUTS
        : { ...ELIGIBLE_ROUND_INPUTS, agent_id: 'significant-events.investigation' };

    await fixture.runOptimize(inputs);

    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    expect(fixture.stepOutput<{ skipped: boolean }>('prepare_turn')?.skipped).toBe(true);
    expect(fixture.stepExecutions('ensure_reinforcement_agent')).toHaveLength(0);
    expect(fixture.agentRuns).toEqual([]);
    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
  });

  // The optimizers are independent of reinforcement: a feature-off install still writes knowledge back.
  it('still optimizes cortex and memory when reinforcement is skipped', async () => {
    const fixture = createNightshiftWorkflowFixture({ decisionTreesEnabled: false });

    await fixture.runOptimize(ELIGIBLE_ROUND_INPUTS);

    expect(runCortexOptimize).toHaveBeenCalled();
    expect(runMemoryOptimize).toHaveBeenCalled();
  });
});

describe('agent optimize workflow, a reinforcement that fails', () => {
  // Swallowing this would report a green round that reinforced nothing, which is exactly how the
  // missing reinforcement agent went unnoticed.
  it('reports the workflow execution as failed', async () => {
    const fixture = createNightshiftWorkflowFixture();
    fixture.failAgentRun(new Error('reinforcement agent crashed'));

    await fixture.runOptimize(ELIGIBLE_ROUND_INPUTS);

    expect(fixture.executionStatus()).toBe(ExecutionStatus.FAILED);
    expect(fixture.stepExecutions('reinforce_decision_trees')[0]?.status).toBe(
      ExecutionStatus.FAILED
    );
  });

  // The agent runs in its own conversation, so a failed reinforcement leaves the round's
  // Cortex and Memory updates in place rather than rolling them back with it.
  it('keeps the cortex and memory optimizer results', async () => {
    const fixture = createNightshiftWorkflowFixture();
    fixture.failAgentRun(new Error('reinforcement agent crashed'));

    await fixture.runOptimize(ELIGIBLE_ROUND_INPUTS);

    expect(fixture.stepOutput<{ status: string }>('optimize_cortex')).toEqual({ status: 'ok' });
    expect(fixture.stepOutput<{ status: string }>('optimize_memory')).toEqual({ status: 'ok' });
  });
});

describe('agent optimize workflow, one optimizer failing', () => {
  // `mode: settled` replaced two workflows that each carried `on-failure: continue`: the sibling
  // still runs, and the failure stays visible in the execution rather than being flattened away.
  it('still runs the other optimizer and records the failed one', async () => {
    const fixture = createNightshiftWorkflowFixture();
    jest.mocked(runCortexOptimize).mockRejectedValue(new Error('cortex optimize failed'));

    await fixture.runOptimize(ELIGIBLE_ROUND_INPUTS);

    expect(fixture.stepExecutions('optimize_cortex')[0]?.status).toBe(ExecutionStatus.FAILED);
    expect(fixture.stepExecutions('optimize_memory')[0]?.status).toBe(ExecutionStatus.COMPLETED);
    expect(fixture.stepOutput<{ status: string }>('optimize_memory')).toEqual({ status: 'ok' });
    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
  });

  it('reports the failed branch in the parallel aggregate', async () => {
    const fixture = createNightshiftWorkflowFixture();
    jest.mocked(runCortexOptimize).mockRejectedValue(new Error('cortex optimize failed'));

    await fixture.runOptimize(ELIGIBLE_ROUND_INPUTS);

    expect(
      fixture.stepOutput<{ failed: number; succeeded: number; status: string }>(
        'optimize_workspaces'
      )
    ).toMatchObject({ failed: 1, succeeded: 1, status: 'failed' });
  });

  // The same shape as a rejected optimizer, but the branch never finishes at all and only
  // `branch-timeout` ends it — which must still leave the sibling optimizer's result readable.
  it('keeps the sibling optimizer result when branch-timeout kills the other', async () => {
    const fixture = createNightshiftWorkflowFixture();
    fixture.stubNeverEndingWriter('nightshift.cortexOptimize');

    await fixture.runOptimize(ELIGIBLE_ROUND_INPUTS);
    await fixture.driveToTerminal();

    expect(fixture.stepExecutions('optimize_cortex')[0]?.status).toBe(ExecutionStatus.TIMED_OUT);
    expect(fixture.stepOutput<{ status: string }>('optimize_memory')).toEqual({ status: 'ok' });
    // The reinforcement tail still runs: a timed-out optimizer must not cancel the round's
    // decision-tree work.
    expect(fixture.agentRuns).toHaveLength(1);
  });
});
