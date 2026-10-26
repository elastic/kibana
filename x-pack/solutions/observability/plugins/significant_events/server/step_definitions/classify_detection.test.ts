/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNAL_VERDICTS, type SignalVerdict } from '@kbn/significant-events-schema';
import { classifyDetection, toMemberState } from './classify_detection';
import type { ProbeOutcome } from '../lib/significant_events/rules/run_probe';

const withRows: ProbeOutcome = { status: 'ok', hasRows: true };
const withoutRows: ProbeOutcome = { status: 'ok', hasRows: false };
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
    ['breaching with rows', [member('confirms')], withRows, 'skip', 'still_breaching'],
    ['breaching without rows', [member('confirms')], withoutRows, 'needs_agent', 'state_changed'],
    ['healthy with rows', [member('refutes')], withRows, 'needs_agent', 'state_changed'],
    ['healthy without rows', [member('refutes')], withoutRows, 'skip', 'still_healthy'],
    ['an unjudged member', [member('off_topic')], withRows, 'needs_agent', 'unjudged_member'],
    ['no live series', [], withRows, 'needs_agent', 'not_live_member'],
    [
      'a probe that could not run',
      [member('confirms')],
      { status: 'timeout' as const, hasRows: true },
      'needs_agent',
      'probe_unavailable',
    ],
    [
      'series that agree',
      [member('confirms'), member('confirms')],
      withRows,
      'skip',
      'still_breaching',
    ],
    [
      'series that disagree with each other',
      [member('confirms'), member('refutes')],
      withRows,
      'needs_agent',
      'state_changed',
    ],
    [
      'a healthy verdict reached on found rows, whatever the probe says',
      [member('confirms'), { verdict: 'refutes' as const, evidenceFound: true }],
      withRows,
      'needs_agent',
      'state_changed',
    ],
  ])('decides %s', (_name, memberships, probe, decision, reason) => {
    expect(classifyDetection({ memberships, probe })).toEqual({ decision, reason });
  });

  // The invariant that keeps the classifier from hiding a change: a skip needs positive evidence.
  describe('fail-safe invariant', () => {
    const probes: ProbeOutcome[] = (
      ['ok', 'error', 'timeout', 'no_query', 'aborted'] as const
    ).flatMap((status) => [
      { status, hasRows: true },
      { status, hasRows: false },
    ]);
    const verdictLists: SignalVerdict[][] = [
      [],
      ...SIGNAL_VERDICTS.map((verdict) => [verdict]),
      ...SIGNAL_VERDICTS.flatMap((first) => SIGNAL_VERDICTS.map((second) => [first, second])),
    ];

    it('skips only when the probe is ok and every member agrees with the fresh rows', () => {
      for (const verdicts of verdictLists) {
        for (const probe of probes) {
          const { decision } = classifyDetection({ memberships: verdicts.map(member), probe });
          const states = verdicts.map(toMemberState);
          const everyMemberAgrees =
            states.length > 0 &&
            states.every(
              (state) => state !== 'unjudged' && (state === 'breaching') === probe.hasRows
            );
          expect(decision === 'skip').toBe(probe.status === 'ok' && everyMemberAgrees);
        }
      }
    });
  });
});
