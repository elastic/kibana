/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { ExecutionStatus } from '@kbn/workflows';
import {
  createFpTpTrajectoryEvaluator,
  outcomeAccuracy,
  payloadConformance,
  skipFailedRuns,
  unsafeClose,
} from './evaluators';
import type { FpTpOutcome } from './constants';
import type { FpTpTaskOutput } from './workflow_task';

const completed: FpTpTaskOutput = {
  executionId: 'exec-1',
  executionStatus: ExecutionStatus.COMPLETED,
  outcome: 'false_positive',
  payload: { verdict: 'false_positive', summary_markdown: 'A summary' },
  attackDiscoveryIdEcho: 'ad-1',
  seededIds: { attackDiscoveryId: 'ad-1', alertIds: [], entityIds: [], eventIds: [] },
  seededEvidence: { alerts: [], entities: [], events: [] },
  agentConversationIds: [],
  toolCallIds: [],
  toolCallsUnavailable: false,
};

const failed: FpTpTaskOutput = {
  ...completed,
  executionStatus: ExecutionStatus.FAILED,
  outcome: 'failed',
  payload: undefined,
  attackDiscoveryIdEcho: undefined,
};

const score = async (
  evaluator: Evaluator,
  output: FpTpTaskOutput,
  gold: FpTpOutcome
): Promise<number | null | undefined> =>
  (await evaluator.evaluate({ input: {}, output, expected: { outcome: gold }, metadata: {} }))
    .score;

describe('OutcomeAccuracy', () => {
  it('returns 1 when the outcome matches the gold', async () => {
    expect(await score(outcomeAccuracy, completed, 'false_positive')).toBe(1);
  });

  it('returns 0 when the outcome differs from the gold', async () => {
    expect(await score(outcomeAccuracy, completed, 'inconclusive')).toBe(0);
  });

  it('returns 1 for a failed run whose gold is failed', async () => {
    expect(await score(outcomeAccuracy, failed, 'failed')).toBe(1);
  });

  it.each([ExecutionStatus.TIMED_OUT, ExecutionStatus.CANCELLED, ExecutionStatus.RUNNING])(
    'returns 0 for a %s run whose gold is failed',
    async (executionStatus) => {
      expect(await score(outcomeAccuracy, { ...failed, executionStatus }, 'failed')).toBe(0);
    }
  );

  it('returns 0 for a run with no outcome', async () => {
    expect(await score(outcomeAccuracy, { ...completed, outcome: undefined }, 'inconclusive')).toBe(
      0
    );
  });
});

describe('UnsafeClose', () => {
  it.each<FpTpOutcome>(['true_positive', 'inconclusive', 'failed'])(
    'returns 0 for false_positive when the gold is %s',
    async (gold) => {
      expect(await score(unsafeClose, completed, gold)).toBe(0);
    }
  );

  it('returns 1 for false_positive when the gold is false_positive', async () => {
    expect(await score(unsafeClose, completed, 'false_positive')).toBe(1);
  });

  it('returns 1 for inconclusive when the gold is true_positive', async () => {
    expect(
      await score(unsafeClose, { ...completed, outcome: 'inconclusive' }, 'true_positive')
    ).toBe(1);
  });
});

describe('PayloadConformance', () => {
  it('returns 1 for a conforming payload', async () => {
    expect(await score(payloadConformance, completed, 'false_positive')).toBe(1);
  });

  it.each<[string, Partial<FpTpTaskOutput>]>([
    ['an unsupported verdict', { payload: { verdict: 'failed', summary_markdown: 'A summary' } }],
    ['an empty summary', { payload: { verdict: 'inconclusive', summary_markdown: ' ' } }],
    [
      'an oversized summary',
      { payload: { verdict: 'inconclusive', summary_markdown: 'x'.repeat(8001) } },
    ],
    [
      'an oversized rationale',
      {
        payload: {
          verdict: 'inconclusive',
          summary_markdown: 'A summary',
          rationale_markdown: 'x'.repeat(50001),
        },
      },
    ],
    ['a different attack id echo', { attackDiscoveryIdEcho: 'ad-2' }],
    ['a conforming payload from a failed execution', { executionStatus: ExecutionStatus.FAILED }],
    ['no payload', { payload: undefined }],
  ])('returns 0 for %s', async (_, overrides) => {
    expect(await score(payloadConformance, { ...completed, ...overrides }, 'inconclusive')).toBe(0);
  });

  it('returns 1 for a run that should fail and produced no payload', async () => {
    expect(await score(payloadConformance, failed, 'failed')).toBe(1);
  });

  it('returns 0 for a run that should fail but produced a payload', async () => {
    expect(await score(payloadConformance, completed, 'failed')).toBe(0);
  });

  it('returns 0 for a run that should fail but completed without a payload', async () => {
    expect(
      await score(
        payloadConformance,
        { ...failed, executionStatus: ExecutionStatus.COMPLETED, outcome: undefined },
        'failed'
      )
    ).toBe(0);
  });

  it.each([ExecutionStatus.TIMED_OUT, ExecutionStatus.CANCELLED, ExecutionStatus.RUNNING])(
    'returns 0 for a run that should fail but ended %s',
    async (executionStatus) => {
      expect(await score(payloadConformance, { ...failed, executionStatus }, 'failed')).toBe(0);
    }
  );
});

describe('trajectory', () => {
  const trajectory = createFpTpTrajectoryEvaluator();

  it('returns 1 when the agent called no tools', async () => {
    expect(await score(trajectory, completed, 'false_positive')).toBe(1);
  });

  it('returns less than 1 when the agent called a tool', async () => {
    expect(
      await score(trajectory, { ...completed, toolCallIds: ['search'] }, 'false_positive')
    ).toBeLessThan(1);
  });

  it('returns N/A when traces are unavailable', async () => {
    expect(
      await score(trajectory, { ...completed, toolCallsUnavailable: true }, 'false_positive')
    ).toBeNull();
  });
});

describe('skipFailedRuns', () => {
  const inner: Evaluator = {
    name: 'Criteria',
    kind: 'LLM',
    direction: 'maximize',
    evaluate: jest.fn().mockResolvedValue({ score: 0.5 }),
  };
  const wrapped = skipFailedRuns(inner);

  it('returns N/A for a failed run', async () => {
    expect(await score(wrapped, failed, 'failed')).toBeNull();
  });

  it('returns the inner score for a completed run', async () => {
    expect(await score(wrapped, completed, 'false_positive')).toBe(0.5);
  });
});
