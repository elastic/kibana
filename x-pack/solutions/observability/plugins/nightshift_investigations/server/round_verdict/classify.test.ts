/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NO_VERDICT, classifyRound, verdictFromRecoveryOutcome } from './classify';
import {
  RECORD_RECOVERY_OUTCOME_TOOL_ID,
  findRecoveryOutcome,
  type RecoveryOutcome,
} from './recovery_outcome';

const outcome = (overrides: Partial<RecoveryOutcome> = {}): RecoveryOutcome => ({
  verdict: 'confirmed',
  resolved_by: 'fix_or_rollback',
  resolution: 'Rolling back inventory 2.14.0 ended the errors.',
  hypotheses: [
    { candidate: 'inventory 2.14.0 rollout', outcome: 'supported' },
    { candidate: 'payment processor outage', outcome: 'contradicted' },
    { candidate: 'cache eviction', outcome: 'not_tested' },
  ],
  ...overrides,
});

const recordCall = (params: unknown) => ({
  tool_id: RECORD_RECOVERY_OUTCOME_TOOL_ID,
  params: params as Record<string, unknown>,
});

describe('findRecoveryOutcome', () => {
  it('takes the last valid call, so the agent can correct itself', () => {
    expect(
      findRecoveryOutcome([
        recordCall(outcome({ verdict: 'unresolved' })),
        { tool_id: 'agentic_investigations.set_hypotheses', params: {} },
        recordCall(outcome({ verdict: 'contradicted' })),
        recordCall({ verdict: 'not-a-verdict' }),
      ])
    ).toMatchObject({ verdict: 'contradicted' });
  });

  it('finds nothing when the agent never made the call', () => {
    expect(findRecoveryOutcome([{ tool_id: 'other', params: outcome() }])).toBeUndefined();
  });
});

describe('verdictFromRecoveryOutcome', () => {
  it('confirms the cause when the recovery confirmed it', () => {
    const verdict = verdictFromRecoveryOutcome(outcome());

    expect(verdict).toMatchObject({
      isFeedback: true,
      causalConfirmed: true,
      source: 'recovery_outcome',
    });
    expect(verdict.causalSummary).toContain('Rolling back inventory 2.14.0 ended the errors.');
    expect(verdict.causalSummary).toContain(
      'Supported by the recovery:\n- inventory 2.14.0 rollout'
    );
    expect(verdict.causalSummary).toContain(
      'Contradicted by the recovery:\n- payment processor outage'
    );
    expect(verdict.causalSummary).not.toContain('cache eviction');
  });

  it.each(['contradicted', 'partly_supported'] as const)(
    'counts a %s cause as feedback that confirms nothing',
    (result) => {
      expect(verdictFromRecoveryOutcome(outcome({ verdict: result }))).toMatchObject({
        isFeedback: true,
        causalConfirmed: false,
        source: 'recovery_outcome',
      });
    }
  );

  it('ignores an unresolved recovery, a snoozed alert, and a missing call', () => {
    expect(verdictFromRecoveryOutcome(outcome({ verdict: 'unresolved' }))).toEqual(NO_VERDICT);
    expect(verdictFromRecoveryOutcome(outcome({ resolved_by: 'suppressed' }))).toEqual(NO_VERDICT);
    expect(verdictFromRecoveryOutcome(undefined)).toEqual(NO_VERDICT);
  });
});

describe('classifyRound', () => {
  const runCausalCheck = jest.fn();

  beforeEach(() => {
    runCausalCheck.mockReset();
  });

  it('gives a first round no verdict and no LLM call', async () => {
    await expect(
      classifyRound({ roundKind: 'initial', toolCalls: [recordCall(outcome())], runCausalCheck })
    ).resolves.toEqual({ ...NO_VERDICT, source: 'initial_round' });
    expect(runCausalCheck).not.toHaveBeenCalled();
  });

  it('reads a recovery round from its recorded outcome, with no LLM call', async () => {
    await expect(
      classifyRound({
        roundKind: 'alert_recovery',
        toolCalls: [recordCall(outcome())],
        runCausalCheck,
      })
    ).resolves.toMatchObject({ causalConfirmed: true, source: 'recovery_outcome' });
    expect(runCausalCheck).not.toHaveBeenCalled();
  });

  it('checks any other follow-up with the causal check', async () => {
    runCausalCheck.mockResolvedValue({
      isFeedback: true,
      causalConfirmed: true,
      causalSummary: 'The deploy caused it.',
      learning: 'Check deploys first.',
    });

    await expect(
      classifyRound({ roundKind: 'follow_up', toolCalls: [recordCall(outcome())], runCausalCheck })
    ).resolves.toEqual({
      isFeedback: true,
      causalConfirmed: true,
      causalSummary: 'The deploy caused it.',
      learning: 'Check deploys first.',
      source: 'causal_check',
    });
  });

  it('keeps nothing from a follow-up that is not feedback', async () => {
    runCausalCheck.mockResolvedValue({
      isFeedback: false,
      causalConfirmed: false,
      causalSummary: 'A new question about disk usage.',
      learning: 'Something.',
    });

    await expect(
      classifyRound({ roundKind: 'follow_up', toolCalls: [], runCausalCheck })
    ).resolves.toEqual({ ...NO_VERDICT, source: 'causal_check' });
  });
});
