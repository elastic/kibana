/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { baseInputs, createGateFixture, type ExistingProposal } from './hunt_proposal_gate_fixture';

jest.setTimeout(120_000);

/**
 * The harness has no workflow registry, so `create_and_gate_proposal` fails with `Workflow not
 * found: system-create-alertzero-proposal`. That is a create failure with no Proposal under the
 * id (not a conflict / already-exists refusal), which is the path under test. The engine still
 * records the rendered input of the journal steps before their own lookup fails, which is what
 * the assertions read. A real conflict is covered by the contract Liquid tests and the live run
 * in the PR body.
 */
const run = async (existingProposal: ExistingProposal, overrides: Record<string, unknown> = {}) => {
  const fixture = createGateFixture({ existingProposal });
  await fixture.run(baseInputs(overrides));
  return fixture;
};

const hasRenderedInput = (fixture: ReturnType<typeof createGateFixture>, stepId: string) =>
  fixture.stepExecutions(stepId).some((step) => step.input !== undefined);

describe('system-security-hunt-proposal-gate when the create fails', () => {
  describe.each([
    ['the lookup finds no Proposal', undefined],
    ['the lookup itself fails', 'error' as const],
  ])('and %s', (_, existingProposal) => {
    it('journals the failure and ends the run failed, without emitting a result', async () => {
      const fixture = await run(existingProposal);

      expect(fixture.execution()?.status).toBe(ExecutionStatus.FAILED);
      expect(fixture.execution()?.error?.message).toMatch(/^Proposal creation failed:/);
      expect(fixture.execution()?.error?.message).toContain('system-create-alertzero-proposal');

      const note = fixture.renderedMessage('journal_create_failure');
      expect(note).toContain('"Isolate host A"');
      expect(note).toContain('`report-1`');
      expect(note).toContain('stays open');

      expect(hasRenderedInput(fixture, 'journal_lost_race')).toBe(false);
      expect(fixture.stepExecutions('emit_result')).toHaveLength(0);
    });
  });

  it('names no report in the note when packaging sent none', async () => {
    const fixture = await run(undefined, { reportId: undefined });
    const note = fixture.renderedMessage('journal_create_failure');

    expect(note).toContain("this Investigation's report");
    expect(note).not.toContain('targeting report `');
  });

  it('stays completed with no note when the Proposal was created on this conversation and failed later', async () => {
    const fixture = await run({ conversationId: 'conv-1' });

    expect(fixture.execution()?.status).toBe(ExecutionStatus.COMPLETED);
    expect(hasRenderedInput(fixture, 'journal_create_failure')).toBe(false);
    expect(hasRenderedInput(fixture, 'journal_lost_race')).toBe(false);
    expect(
      fixture
        .stepExecutions('fail_on_create_failure')
        .some((step) => step.status === ExecutionStatus.COMPLETED)
    ).toBe(false);
    expect(fixture.stepExecutions('emit_result').length).toBeGreaterThan(0);
  });

  it('keeps the lost-race note and stays completed when another conversation owns the Proposal', async () => {
    const fixture = await run({ conversationId: 'conv-other' });

    expect(fixture.execution()?.status).toBe(ExecutionStatus.COMPLETED);
    expect(fixture.renderedMessage('journal_lost_race')).toContain('conv-other');
    expect(hasRenderedInput(fixture, 'journal_create_failure')).toBe(false);
    expect(
      fixture
        .stepExecutions('fail_on_create_failure')
        .some((step) => step.status === ExecutionStatus.COMPLETED)
    ).toBe(false);
    expect(fixture.stepExecutions('emit_result').length).toBeGreaterThan(0);
  });
});
