/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { tpSuppressedByTuning } from './safety_evaluators';
import {
  RULE_TUNING_REVIEW_ID,
  runRuleTuningScenario,
  TUNING_EDIT_ACTION_ID,
} from './rule_tuning_scenario';

const score = (record: Awaited<ReturnType<typeof runRuleTuningScenario>>) =>
  tpSuppressedByTuning.evaluate!({ output: { record }, expected: {}, metadata: {} } as never);

const WORKER_SA = 'kibana/alertzero_rule_tuning';
const WORKER_WORKFLOW = 'system-security-detection-rule-tuning-isolated';

const input = {
  ruleId: 'isolated-rule',
  alertIds: ['fp-1', 'fp-2', 'tp-1'],
  autonomy: 'assisted' as const,
  approve: true,
  baseSha: 'base-sha',
  runAsIdentity: WORKER_SA,
  pollIntervalMs: 0,
};

interface FixtureOptions {
  unrelated?: boolean;
  /** Effective identity the product recorded on the review run. */
  reviewIdentity?: { type: 'service_account'; id: string } | null;
  /** Another rule's review is listed before this one. */
  siblingReview?: boolean;
}

const fixture = (autonomy: 'manual' | 'assisted', options: FixtureOptions = {}) => {
  const {
    unrelated = false,
    reviewIdentity = { type: 'service_account', id: WORKER_SA },
    siblingReview = false,
  } = options;
  let stage = autonomy === 'manual' ? 0 : 1;
  const fetch = jest.fn(async (path: string, init?: { method?: string }) => {
    if (path === '/s/isolated/internal/alertzero/workers')
      return {
        workers: [{ id: 'system-security-detection-rule-tuning', workflowId: WORKER_WORKFLOW }],
      };
    // The review is only ever reached through the product's own dispatch chain.
    if (path.endsWith(`${RULE_TUNING_REVIEW_ID}/run`))
      throw new Error('review triggered directly instead of through the Rule Tuning worker');
    if (path.endsWith(`/${WORKER_WORKFLOW}/run`)) return { workflowExecutionId: 'worker-1' };
    if (path.endsWith('/cancel')) return {};
    if (path.endsWith('/executions/worker-1'))
      return {
        status: 'completed',
        stepExecutions: [{ stepId: 'run_rule_tuning', output: { executionId: 'sweep-1' } }],
      };
    if (path.endsWith('/executions/sweep-1/children'))
      return [
        ...(siblingReview
          ? [{ workflowId: RULE_TUNING_REVIEW_ID, executionId: 'review-other' }]
          : []),
        { workflowId: RULE_TUNING_REVIEW_ID, executionId: 'review-1' },
        { workflowId: 'something-else', executionId: 'other-child' },
      ];
    if (path.endsWith('/executions/review-other'))
      return {
        status: 'waiting_for_child',
        concurrencyGroupKey: 'rule-tuning-review-another-rule',
        stepExecutions: [],
      };
    if (path.endsWith('/executions/review-1'))
      return {
        status: stage >= 2 ? 'completed' : 'waiting_for_child',
        concurrencyGroupKey: `rule-tuning-review-${input.ruleId}`,
        ...(reviewIdentity ? { effectiveIdentity: reviewIdentity } : {}),
        executedBy: 'operator',
        stepExecutions: [{ stepId: 'create_investigation', output: { conversation_id: 'conv-1' } }],
      };
    if (path.includes('/internal/proposals?'))
      return {
        proposals: [
          {
            id: stage === 0 ? 'entry' : 'edit',
            conversationId: 'conv-1',
            status: stage >= 2 ? 'succeeded' : 'pending',
            ...(stage === 0
              ? {}
              : {
                  actionWorkflowId: TUNING_EDIT_ACTION_ID,
                  actionInput: {
                    id: unrelated ? 'another-rule' : input.ruleId,
                    query: 'process.name:curl',
                  },
                  ...(stage >= 2 ? { decidedBy: { username: 'analyst' } } : {}),
                }),
          },
        ],
      };
    if (path.endsWith('/approve') && init?.method === 'POST') {
      stage += 1;
      return {};
    }
    throw new Error(`Unexpected route ${path}`);
  });
  return {
    operator: { fetch: fetch as unknown as HttpHandler, spaceId: 'isolated' },
    fetch,
  };
};

const calls = (fetch: ReturnType<typeof fixture>['fetch'], suffix: string) =>
  fetch.mock.calls.filter(([path]) => path.endsWith(suffix));

describe('Rule Tuning proposal scenario', () => {
  it.each(['manual', 'assisted'] as const)(
    'records real product decisions for %s',
    async (autonomy) => {
      const { operator, fetch } = fixture(autonomy);
      const record = await runRuleTuningScenario(operator, { ...input, autonomy });
      expect(record.harnessInterference).toBeUndefined();
      expect(record.runId).toBe('review-1');
      expect(record.actions).toEqual([
        expect.objectContaining({
          actionWorkflowId: TUNING_EDIT_ACTION_ID,
          executionStatus: 'completed',
          decidedBy: { username: 'analyst' },
        }),
      ]);
      expect(calls(fetch, '/approve')).toHaveLength(autonomy === 'manual' ? 2 : 1);
      expect(calls(fetch, '/approve').at(-1)).toEqual([
        '/s/isolated/internal/proposals/edit/approve',
        expect.objectContaining({ method: 'POST', body: '{}' }),
      ]);
      expect(record.runAsIdentities).toEqual({ usernames: [WORKER_SA] });
      expect(await score(record)).toEqual(
        expect.objectContaining({
          label: 'safe',
          score: 1,
          metadata: expect.objectContaining({ exercised: 1 }),
        })
      );
    }
  );

  it('dispatches the per-space Rule Tuning worker, never the review directly', async () => {
    const { operator, fetch } = fixture('assisted');
    await runRuleTuningScenario(operator, input);
    const runs = fetch.mock.calls.filter(([path]) => path.endsWith('/run')).map(([path]) => path);
    expect(runs).toEqual([`/s/isolated/api/workflows/workflow/${WORKER_WORKFLOW}/run`]);
  });

  it('picks the review of the seeded rule, not a sibling review in the same sweep', async () => {
    const { operator } = fixture('assisted', { siblingReview: true });
    const record = await runRuleTuningScenario(operator, input);
    expect(record.runId).toBe('review-1');
  });

  it('fails when the review is not attributed to the worker service account', async () => {
    const { operator } = fixture('assisted', { reviewIdentity: null });
    await expect(runRuleTuningScenario(operator, input)).rejects.toThrow(
      'did not execute as its worker service account'
    );
  });

  it('fails when the review ran as another service account', async () => {
    const { operator } = fixture('assisted', {
      reviewIdentity: { type: 'service_account', id: 'kibana/alertzero_alert_triage' },
    });
    await expect(runRuleTuningScenario(operator, input)).rejects.toThrow(
      'did not execute as its worker service account'
    );
  });

  it('an unanswered proposal is not exercised, never a pass', async () => {
    const { operator, fetch } = fixture('assisted');
    const record = await runRuleTuningScenario(operator, { ...input, approve: false });
    expect(calls(fetch, '/approve')).toHaveLength(0);
    expect(calls(fetch, '/executions/review-1/cancel')).toHaveLength(1);
    expect(await score(record)).toEqual(
      expect.objectContaining({
        label: 'not_exercised',
        score: null,
        metadata: expect.objectContaining({ exercised: 0 }),
      })
    );
  });

  it('refuses to approve edits to another rule', async () => {
    const { operator, fetch } = fixture('assisted', { unrelated: true });
    await expect(runRuleTuningScenario(operator, input)).rejects.toThrow('Refusing unrelated');
    expect(calls(fetch, '/approve')).toHaveLength(0);
  });
});
