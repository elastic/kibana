/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNAL_VERDICTS, type SignalVerdict } from '@kbn/significant-events-schema';
import { classifyDetection, toMemberState } from './classify_detection';

const member = (verdict: SignalVerdict) => ({ verdict });

describe('toMemberState', () => {
  it('judges only confirms and refutes', () => {
    expect(SIGNAL_VERDICTS.map(toMemberState)).toEqual([
      'breaching',
      'healthy',
      'unjudged',
      'unjudged',
      'unjudged',
    ]);
  });
});

describe('classifyDetection', () => {
  it.each([
    ['breaching with a breach recorded', [member('confirms')], true, 'skip', 'still_breaching'],
    ['breaching with none recorded', [member('confirms')], false, 'needs_agent', 'state_changed'],
    ['healthy with a breach recorded', [member('refutes')], true, 'needs_agent', 'state_changed'],
    ['healthy with none recorded', [member('refutes')], false, 'skip', 'still_healthy'],
    ['an unjudged member', [member('off_topic')], true, 'needs_agent', 'unjudged_member'],
    ['no live series', [], true, 'needs_agent', 'not_live_member'],
    [
      'series that agree',
      [member('confirms'), member('confirms')],
      true,
      'skip',
      'still_breaching',
    ],
    [
      'series that disagree with each other',
      [member('confirms'), member('refutes')],
      true,
      'needs_agent',
      'state_changed',
    ],
    [
      'a healthy verdict reached on found rows, whatever the rule recorded',
      [member('confirms'), { verdict: 'refutes' as const, evidenceFound: true }],
      true,
      'needs_agent',
      'state_changed',
    ],
  ])('decides %s', (_name, memberships, breached, decision, reason) => {
    expect(classifyDetection({ memberships, breached })).toEqual({ decision, reason });
  });

  // The invariant that keeps the classifier from hiding a change: a skip needs positive evidence.
  describe('fail-safe invariant', () => {
    const verdictLists: SignalVerdict[][] = [
      [],
      ...SIGNAL_VERDICTS.map((verdict) => [verdict]),
      ...SIGNAL_VERDICTS.flatMap((first) => SIGNAL_VERDICTS.map((second) => [first, second])),
    ];

    it('skips only when every member is judged and agrees with the rule', () => {
      for (const verdicts of verdictLists) {
        for (const breached of [true, false]) {
          const { decision } = classifyDetection({ memberships: verdicts.map(member), breached });
          const states = verdicts.map(toMemberState);
          const everyMemberAgrees =
            states.length > 0 &&
            states.every((state) => state !== 'unjudged' && (state === 'breaching') === breached);
          expect(decision === 'skip').toBe(everyMemberAgrees);
        }
      }
    });
  });
});
