/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BREACH_WINDOW_MINUTES, classifyBatch } from './classify_batch';
import {
  NOW,
  breachedMinutesAgo,
  detectionRow,
  membership,
  membersOf,
  batchParams,
  decided,
  noBreaches,
} from './classify_test_helpers';

describe("a rule's own recorded breach", () => {
  const classifyRuleA = async ({
    verdict,
    findRecentBreaches,
  }: {
    verdict: 'confirms' | 'refutes';
    findRecentBreaches: (ruleUuids: string[]) => Promise<Map<string, number>>;
  }) => {
    const output = await classifyBatch(
      batchParams({
        rows: [detectionRow('rule-A')],
        findLiveMembers: async () => membersOf({ 'rule-A': [membership(verdict)] }),
        findRecentBreaches,
      })
    );
    return { output, decision: decided(output)['rule-A'] };
  };

  it('says the rule still matches when it breached inside its last two runs', async () => {
    const { output } = await classifyRuleA({
      verdict: 'confirms',
      findRecentBreaches: breachedMinutesAgo(4),
    });

    expect(output.skips).toEqual([
      {
        rule_uuid: 'rule-A',
        skip: expect.objectContaining({
          reason: 'still_breaching',
          rule_breached: true,
          breach_window_minutes: BREACH_WINDOW_MINUTES,
        }),
      },
    ]);
  });

  it('counts a breach exactly two runs old, and not a minute older', async () => {
    const atTheEdge = await classifyRuleA({
      verdict: 'confirms',
      findRecentBreaches: breachedMinutesAgo(BREACH_WINDOW_MINUTES),
    });
    const past = await classifyRuleA({
      verdict: 'confirms',
      findRecentBreaches: breachedMinutesAgo(BREACH_WINDOW_MINUTES + 1),
    });

    expect(atTheEdge.decision).toMatchObject({ decision: 'skip', reason: 'still_breaching' });
    expect(past.decision).toMatchObject({ decision: 'needs_agent', reason: 'state_changed' });
  });

  it('sends a healthy verdict to the agent when the rule breached again', async () => {
    const { decision } = await classifyRuleA({
      verdict: 'refutes',
      findRecentBreaches: breachedMinutesAgo(2),
    });

    expect(decision).toMatchObject({
      decision: 'needs_agent',
      reason: 'state_changed',
      rule_breached: true,
    });
  });

  it('reads a rule with no recent breach as matching nothing', async () => {
    const confirming = await classifyRuleA({ verdict: 'confirms', findRecentBreaches: noBreaches });
    const healthy = await classifyRuleA({ verdict: 'refutes', findRecentBreaches: noBreaches });

    expect(confirming.decision).toMatchObject({
      decision: 'needs_agent',
      reason: 'state_changed',
      rule_breached: false,
    });
    expect(healthy.output.skips).toEqual([
      {
        rule_uuid: 'rule-A',
        skip: expect.objectContaining({
          reason: 'still_healthy',
          rule_breached: false,
          breach_window_minutes: BREACH_WINDOW_MINUTES,
        }),
      },
    ]);
  });

  it("does not take another rule's breach for the rule's own", async () => {
    const { decision } = await classifyRuleA({
      verdict: 'confirms',
      findRecentBreaches: async () => new Map([['rule-B', NOW - 60_000]]),
    });

    expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'state_changed' });
  });

  it('reads the breaches once, for every rule, over the last two runs', async () => {
    const findRecentBreaches = jest.fn(breachedMinutesAgo(1));

    await classifyBatch(
      batchParams({
        rows: [detectionRow('rule-A'), detectionRow('rule-B'), detectionRow('rule-A')],
        findRecentBreaches,
      })
    );

    expect(findRecentBreaches).toHaveBeenCalledTimes(1);
    expect(findRecentBreaches).toHaveBeenCalledWith(
      ['rule-A', 'rule-B'],
      new Date(NOW - 10 * 60_000).toISOString()
    );
  });

  it('lets the failure of the read reach the step, which sends every row on unjudged', async () => {
    await expect(
      classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A')],
          findRecentBreaches: async () => {
            throw new Error('search_phase_execution_exception');
          },
        })
      )
    ).rejects.toThrow('search_phase_execution_exception');
  });
});
