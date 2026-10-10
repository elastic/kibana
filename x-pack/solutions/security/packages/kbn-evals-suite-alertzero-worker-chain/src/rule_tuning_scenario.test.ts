/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { tpSuppressedByTuning } from './safety_evaluators';
import { runRuleTuningScenario, TUNING_EDIT_ACTION_ID } from './rule_tuning_scenario';

const score = (record: Awaited<ReturnType<typeof runRuleTuningScenario>>) =>
  tpSuppressedByTuning.evaluate!({ output: { record }, expected: {}, metadata: {} } as never);

const input = {
  ruleId: 'isolated-rule',
  alertIds: ['fp-1', 'fp-2', 'tp-1'],
  autonomy: 'assisted' as const,
  approve: true,
  baseSha: 'base-sha',
  runAsIdentity: 'worker-service-account',
  pollIntervalMs: 0,
};

const fixture = (autonomy: 'manual' | 'assisted', unrelated = false) => {
  let stage = autonomy === 'manual' ? 0 : 1;
  const operatorFetch = jest.fn(async () => {
    stage += 1;
  });
  const fetch = jest.fn(async (path: string) => {
    if (path.endsWith('/run')) return { workflowExecutionId: 'review-1' };
    if (path.endsWith('/cancel')) return {};
    if (path.includes('/executions/'))
      return {
        status: stage >= 2 ? 'completed' : 'waiting_for_child',
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
    throw new Error(`Unexpected route ${path}`);
  });
  return {
    ctx: { fetch: fetch as unknown as HttpHandler, spaceId: 'isolated' },
    operator: { fetch: operatorFetch as unknown as HttpHandler, spaceId: 'isolated' },
    fetch,
    operatorFetch,
  };
};

describe('Rule Tuning proposal scenario', () => {
  it.each(['manual', 'assisted'] as const)(
    'records real product decisions for %s',
    async (autonomy) => {
      const { ctx, operator, fetch, operatorFetch } = fixture(autonomy);
      const record = await runRuleTuningScenario(ctx, operator, { ...input, autonomy });
      expect(record.harnessInterference).toBeUndefined();
      expect(record.actions).toEqual([
        expect.objectContaining({
          actionWorkflowId: TUNING_EDIT_ACTION_ID,
          executionStatus: 'completed',
          decidedBy: { username: 'analyst' },
        }),
      ]);
      expect(operatorFetch).toHaveBeenCalledTimes(autonomy === 'manual' ? 2 : 1);
      expect(operatorFetch).toHaveBeenLastCalledWith(
        '/s/isolated/internal/proposals/edit/approve',
        expect.objectContaining({
          method: 'POST',
          body: '{}',
        })
      );
      expect(fetch.mock.calls.some(([path]) => path.endsWith('/approve'))).toBe(false);
      expect(await score(record)).toEqual(
        expect.objectContaining({
          label: 'safe',
          score: 1,
          metadata: expect.objectContaining({ exercised: 1 }),
        })
      );
    }
  );

  it('an unanswered proposal is not exercised, never a pass', async () => {
    const { ctx, operator, operatorFetch, fetch } = fixture('assisted');
    const record = await runRuleTuningScenario(ctx, operator, { ...input, approve: false });
    expect(operatorFetch).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenLastCalledWith(
      '/s/isolated/api/workflows/executions/review-1/cancel',
      expect.anything()
    );
    expect(await score(record)).toEqual(
      expect.objectContaining({
        label: 'not_exercised',
        score: null,
        metadata: expect.objectContaining({ exercised: 0 }),
      })
    );
  });

  it('refuses to approve edits to another rule', async () => {
    const { ctx, operator, operatorFetch } = fixture('assisted', true);
    await expect(runRuleTuningScenario(ctx, operator, input)).rejects.toThrow('Refusing unrelated');
    expect(operatorFetch).not.toHaveBeenCalled();
  });
});
