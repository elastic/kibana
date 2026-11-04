/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `system-nightshift-sandbox-materialize-workspace` executed for real.
 *
 * The workflow is the investigator's before-agent hook, so every question here is about what
 * the engine actually does to a round: it allocates once and shares the id, it does nothing on
 * a HITL resume or without a conversation, it no-ops the writers a feature flag turned off, and
 * one writer failing (or being killed by `branch-timeout`) still leaves the round runnable.
 * `index.test.ts` next to the definition asserts the YAML shape; this asserts the behaviour.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID } from '@kbn/workflows/managed';
import { parse } from 'yaml';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../server/agents/investigation';
import { CORTEX_WORKSPACE_ROOT } from '../server/cortex/materialize';
import { DECISION_TREE_WORKSPACE_ROOT } from '../server/decision_trees/materialize';
import { MEMORY_WORKSPACE_ROOT } from '../server/memory/materialize';
import {
  createNightshiftWorkflowFixture,
  hydrateCortexWorkspace,
  hydrateDecisionTreeWorkspace,
  hydrateMemoryWorkspace,
  managedYaml,
  type NightshiftWorkflowFixture,
  type NightshiftWorkflowFixtureOptions,
} from './nightshift_workflow_fixture';

/** The managed YAML as installed, so this test cannot drift from what ships. */
const workflowSteps = (
  parse(managedYaml(NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID)) as {
    steps: Array<{ name: string; with?: unknown }>;
  }
).steps;

interface ComposeOutput {
  model_context?: string;
  workflow_context: {
    'nightshift.semantic_memory.recall': { version: number; data: { recalled_ids: string[] } };
  };
}

const FIRST_EXECUTION_INPUTS = {
  prompt: 'why is checkout slow?',
  conversation_id: 'conv-1',
  agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
  round_execution_index: 0,
};

/** The sandbox the fixture's execution runs in, as `scopeConversationId` builds it. */
const SCOPED_SANDBOX_ID = 'fake_space_id__conv-1';

describe('sandbox materialize workspace workflow, first execution', () => {
  let fixture: NightshiftWorkflowFixture;

  beforeAll(async () => {
    fixture = createNightshiftWorkflowFixture();
    await fixture.runMaterialize(FIRST_EXECUTION_INPUTS);
  });

  it('completes the workflow execution', () => {
    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
  });

  // A second GetContainer per writer would allocate three sessions and let a writer address a
  // workspace other than the investigator's, which is the whole reason obtain runs first.
  it('allocates the sandbox once', () => {
    expect(fixture.stepExecutions('obtain_sandbox')).toHaveLength(1);
    expect(fixture.sandboxStart.getSessionForSpace).toHaveBeenCalledTimes(4); // obtain + 3 writers
  });

  it('hands the same obtained sandbox_id to all three writers', () => {
    // Every writer resolves the session from the unscoped conversation id in the workflow's own
    // Space, so no branch can address a different workspace than obtain allocated.
    expect(fixture.sandboxStart.getSessionForSpace).toHaveBeenCalledWith('fake_space_id', 'conv-1');
    for (const writer of [
      hydrateCortexWorkspace,
      hydrateMemoryWorkspace,
      hydrateDecisionTreeWorkspace,
    ]) {
      expect(writer).toHaveBeenCalledWith(
        expect.objectContaining({ session: expect.anything(), spaceId: 'fake_space_id' })
      );
    }
    expect(hydrateMemoryWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ query: FIRST_EXECUTION_INPUTS.prompt })
    );
    expect(fixture.stepOutput<{ sandbox_id: string }>('hydrate_cortex')?.sandbox_id).toBe(
      SCOPED_SANDBOX_ID
    );
    expect(
      fixture.stepOutput<{ sandbox_id: string }>('memory_materialize_to_sandbox')?.sandbox_id
    ).toBe(SCOPED_SANDBOX_ID);
    expect(fixture.stepOutput<{ sandbox_id: string }>('hydrate_decision_trees')?.sandbox_id).toBe(
      SCOPED_SANDBOX_ID
    );
  });

  it('carries the memory recalled ids into the compose workflow_context', () => {
    // Agent Builder forwards this to the after-execution hook, which hands it to the Memory
    // optimizer. A `${{ }}`-vs-Liquid slip here silently drops the round's memories.
    expect(fixture.stepOutput<ComposeOutput>('compose_prompt')?.workflow_context).toEqual({
      'nightshift.semantic_memory.recall': {
        version: 1,
        data: { recalled_ids: ['mem-1', 'mem-2'] },
      },
    });
  });

  it("composes the writers' own fragments into model context", () => {
    expect(fixture.stepOutput<ComposeOutput>('compose_prompt')?.model_context).toContain(
      '/workspace/memories/checkout.md'
    );
  });
});

describe('sandbox materialize workspace workflow, rounds that must not materialize', () => {
  it.each([
    ['a HITL resume', { ...FIRST_EXECUTION_INPUTS, round_execution_index: 1 }],
    ['a later resume', { ...FIRST_EXECUTION_INPUTS, round_execution_index: 3 }],
    ['no conversation id', { ...FIRST_EXECUTION_INPUTS, conversation_id: undefined }],
  ])('runs nothing for %s', async (_case, inputs) => {
    const fixture = createNightshiftWorkflowFixture();

    await fixture.runMaterialize(inputs);

    // The `if` on obtain covers both a resumed round and a standalone run; the writers and the
    // compose step are then gated on its output, so nothing downstream can allocate a workspace.
    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    expect(fixture.stepExecutions('obtain_sandbox')).toHaveLength(0);
    expect(fixture.stepExecutions('compose_prompt')).toHaveLength(0);
    expect(hydrateCortexWorkspace).not.toHaveBeenCalled();
    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
    expect(hydrateDecisionTreeWorkspace).not.toHaveBeenCalled();
    expect(fixture.sandboxStart.getSessionForSpace).not.toHaveBeenCalled();
  });
});

type WriterName = 'cortex' | 'memory' | 'decision_trees';

const expectOnlyTheseWritersRan = (expected: WriterName[]): void => {
  const ran = (mock: unknown) => jest.mocked(mock as jest.Mock).mock.calls.length > 0;
  const actual = [
    ran(hydrateCortexWorkspace) ? 'cortex' : null,
    ran(hydrateMemoryWorkspace) ? 'memory' : null,
    ran(hydrateDecisionTreeWorkspace) ? 'decision_trees' : null,
  ].filter((writer): writer is WriterName => writer !== null);
  expect(actual.sort()).toEqual([...expected].sort());
};

describe('sandbox materialize workspace workflow, feature matrix', () => {
  it.each<[string, NightshiftWorkflowFixtureOptions, WriterName[]]>([
    [
      'Cortex when Memory and trees are off',
      { cortexEnabled: true, memoryEnabled: false, decisionTreesEnabled: false },
      ['cortex'],
    ],
    [
      'Semantic Memory when Cortex and trees are off',
      { cortexEnabled: false, memoryEnabled: true, decisionTreesEnabled: false },
      ['memory'],
    ],
    [
      'the trees alone when Cortex and Memory are off',
      { cortexEnabled: false, memoryEnabled: false, decisionTreesEnabled: true },
      ['decision_trees'],
    ],
    ['all three writers when every feature is on', {}, ['cortex', 'memory', 'decision_trees']],
  ])('materializes %s', async (_case, options, expected) => {
    const fixture = createNightshiftWorkflowFixture(options);

    await fixture.runMaterialize(FIRST_EXECUTION_INPUTS);

    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    expectOnlyTheseWritersRan(expected);
  });

  // The YAML hard-codes the directory each writer reports on, and the handlers write to the
  // root constants. Nothing at runtime connects the two, so a renamed root would have compose
  // report an incomplete directory nobody ever wrote to.
  it('reports the directories the writers actually write to', () => {
    const compose = workflowSteps.find((step) => step.name === 'compose_prompt');
    const writers = (compose?.with as { writers: Array<{ directory: string }> }).writers;

    expect(writers.map((writer) => writer.directory)).toEqual([
      CORTEX_WORKSPACE_ROOT,
      MEMORY_WORKSPACE_ROOT,
      DECISION_TREE_WORKSPACE_ROOT,
    ]);
  });

  // A disabled writer returns `skipped` rather than nothing, so compose sees it as completed
  // and does not invent an incomplete-materialization notice for a directory nobody wrote to.
  it('keeps a disabled writer silent instead of reporting it as incomplete', async () => {
    const fixture = createNightshiftWorkflowFixture({ decisionTreesEnabled: false });

    await fixture.runMaterialize(FIRST_EXECUTION_INPUTS);

    expect(fixture.stepOutput<{ skipped?: boolean }>('hydrate_decision_trees')?.skipped).toBe(true);
    expect(fixture.stepOutput<ComposeOutput>('compose_prompt')?.model_context).not.toContain(
      '/workspace/decision-trees'
    );
  });
});

describe('sandbox materialize workspace workflow, an unavailable sandbox', () => {
  it('skips every writer and still succeeds when obtain produces no sandbox_id', async () => {
    // The real handler either returns a sandbox_id or throws, so "no id" is modelled by a stand-in
    // obtain step: what matters downstream is that the writers and compose are gated on that id.
    const fixture = createNightshiftWorkflowFixture();
    fixture.stubSandboxUnavailable();

    await fixture.runMaterialize(FIRST_EXECUTION_INPUTS);

    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    expect(fixture.stepExecutions('compose_prompt')).toHaveLength(0);
    expect(hydrateCortexWorkspace).not.toHaveBeenCalled();
    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
    expect(hydrateDecisionTreeWorkspace).not.toHaveBeenCalled();
  });

  // Unlike the `no id` case above, a sandbox that cannot be reached at all fails obtain, and this
  // workflow deliberately has no `on-failure` on it: the round is reported as broken rather than
  // silently starting with an empty workspace.
  it('fails obtain, and writes nothing, when the sandbox cannot be reached', async () => {
    const fixture = createNightshiftWorkflowFixture();
    fixture.sandboxStart.getSessionForSpace.mockImplementation(() => {
      throw new Error('sandbox api unreachable');
    });

    await fixture.runMaterialize(FIRST_EXECUTION_INPUTS);

    expect(fixture.executionStatus()).toBe(ExecutionStatus.FAILED);
    expect(hydrateCortexWorkspace).not.toHaveBeenCalled();
    expect(hydrateMemoryWorkspace).not.toHaveBeenCalled();
    expect(hydrateDecisionTreeWorkspace).not.toHaveBeenCalled();
  });
});

describe('sandbox materialize workspace workflow, a writer that cannot write', () => {
  // The writer catches its own failure and reports the incomplete directory, because this is a
  // before-agent hook: a thrown error here aborts the investigator round over one writer.
  it('completes the round with the incomplete-materialization notice for the failed writer', async () => {
    const fixture = createNightshiftWorkflowFixture();
    jest.mocked(hydrateCortexWorkspace).mockRejectedValue(new Error('sandbox write refused'));

    await fixture.runMaterialize(FIRST_EXECUTION_INPUTS);

    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    expect(fixture.stepOutput<{ failed?: boolean }>('hydrate_cortex')?.failed).toBe(true);
    expect(hydrateMemoryWorkspace).toHaveBeenCalled();
    expect(hydrateDecisionTreeWorkspace).toHaveBeenCalled();
    const modelContext = fixture.stepOutput<ComposeOutput>('compose_prompt')?.model_context;
    expect(modelContext).toContain(
      'Materialization of /workspace/cortex/ encountered an error; ' +
        'its contents may be incomplete or missing.'
    );
    // The writers that did run still report normally.
    expect(modelContext).toContain('/workspace/memories/checkout.md');
  });

  // The timeout branch never reaches its handler, so it produces no output at all and compose has
  // to synthesize the notice from the directory it was configured with.
  it('reports the timed-out writer when branch-timeout kills it', async () => {
    const fixture = createNightshiftWorkflowFixture();
    fixture.stubNeverEndingWriter('nightshift.cortexHydrate');

    await fixture.runMaterialize(FIRST_EXECUTION_INPUTS);
    await fixture.driveToTerminal();

    expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    expect(fixture.stepExecutions('hydrate_cortex')[0]?.status).toBe(ExecutionStatus.TIMED_OUT);
    expect(fixture.stepOutput<ComposeOutput>('compose_prompt')?.model_context).toContain(
      'Materialization of /workspace/cortex/ encountered an error; ' +
        'its contents may be incomplete or missing.'
    );
    expect(fixture.stepOutput<ComposeOutput>('compose_prompt')?.model_context).toContain(
      '/workspace/memories/checkout.md'
    );
  });
});
