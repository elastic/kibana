/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNAL_VERDICTS,
  type NeedsAgentReason,
  type SkipReason,
  type ProbeStatus,
  type SignalVerdict,
} from '@kbn/significant-events-schema';
import {
  classifyDetection,
  toMemberState,
  type DetectionClassification,
  type ProbeOutcome,
} from './classify_detection';

const withRows: ProbeOutcome = { status: 'ok', hasRows: true };
const withoutRows: ProbeOutcome = { status: 'ok', hasRows: false };
const member = (verdict: SignalVerdict) => ({ verdict });

describe('toMemberState', () => {
  it.each<[SignalVerdict, string]>([
    ['confirms', 'breaching'],
    ['refutes', 'healthy'],
    ['inconclusive', 'unjudged'],
    ['not_checked', 'unjudged'],
    ['off_topic', 'unjudged'],
  ])('maps %s to %s', (verdict, state) => {
    expect(toMemberState(verdict)).toBe(state);
  });
});

describe('classifyDetection', () => {
  describe('decision table', () => {
    it.each<
      [
        string,
        SignalVerdict,
        ProbeOutcome,
        DetectionClassification['decision'],
        SkipReason | NeedsAgentReason
      ]
    >([
      ['breaching with rows', 'confirms', withRows, 'skip', 'still_breaching'],
      ['breaching without rows', 'confirms', withoutRows, 'needs_agent', 'state_changed'],
      ['healthy with rows', 'refutes', withRows, 'needs_agent', 'state_changed'],
      ['healthy without rows', 'refutes', withoutRows, 'skip', 'still_healthy'],
    ])('%s', (_name, verdict, probe, decision, reason) => {
      expect(classifyDetection({ memberships: [member(verdict)], probe })).toEqual({
        decision,
        reason,
      });
    });
  });

  describe('a healthy verdict reached on found rows', () => {
    const healthyOnRows = { verdict: 'refutes' as const, evidenceFound: true };

    it('goes to the agent whatever the probe says, since row presence does not validate content', () => {
      for (const probe of [withRows, withoutRows]) {
        expect(classifyDetection({ memberships: [healthyOnRows], probe })).toEqual({
          decision: 'needs_agent',
          reason: 'state_changed',
        });
      }
    });

    it('takes the whole rule to the agent when another series would skip', () => {
      expect(
        classifyDetection({ memberships: [member('confirms'), healthyOnRows], probe: withRows })
      ).toEqual({ decision: 'needs_agent', reason: 'state_changed' });
    });
  });

  it('sends an unjudged member to the agent whatever the probe says', () => {
    for (const verdict of ['inconclusive', 'not_checked', 'off_topic'] as const) {
      for (const probe of [withRows, withoutRows]) {
        expect(classifyDetection({ memberships: [member(verdict)], probe })).toEqual({
          decision: 'needs_agent',
          reason: 'unjudged_member',
        });
      }
    }
  });

  it('sends a rule that is in no live series to the agent', () => {
    expect(classifyDetection({ memberships: [], probe: withRows })).toEqual({
      decision: 'needs_agent',
      reason: 'not_live_member',
    });
  });

  it.each<[ProbeStatus, SkipReason | NeedsAgentReason]>([
    ['error', 'probe_unavailable'],
    ['timeout', 'probe_unavailable'],
    ['aborted', 'probe_unavailable'],
    ['no_query', 'probe_unavailable'],
  ])('sends the detection to the agent when the probe status is %s', (status, reason) => {
    for (const verdict of ['confirms', 'refutes'] as const) {
      expect(
        classifyDetection({ memberships: [member(verdict)], probe: { status, hasRows: true } })
      ).toEqual({ decision: 'needs_agent', reason });
    }
  });

  describe('a rule in several live series', () => {
    it('skips when every series agrees with fresh rows', () => {
      expect(
        classifyDetection({
          memberships: [member('confirms'), member('confirms')],
          probe: withRows,
        })
      ).toEqual({ decision: 'skip', reason: 'still_breaching' });
      expect(
        classifyDetection({
          memberships: [member('refutes'), member('refutes')],
          probe: withoutRows,
        })
      ).toEqual({ decision: 'skip', reason: 'still_healthy' });
    });

    it('sends the detection to the agent when the series disagree with each other', () => {
      const memberships = [member('confirms'), member('refutes')];

      expect(classifyDetection({ memberships, probe: withRows })).toEqual({
        decision: 'needs_agent',
        reason: 'state_changed',
      });
      expect(classifyDetection({ memberships, probe: withoutRows })).toEqual({
        decision: 'needs_agent',
        reason: 'state_changed',
      });
    });

    it('sends the detection to the agent when any series is unjudged', () => {
      expect(
        classifyDetection({
          memberships: [member('confirms'), member('inconclusive')],
          probe: withRows,
        })
      ).toEqual({ decision: 'needs_agent', reason: 'unjudged_member' });
    });
  });

  describe('fail-safe invariant', () => {
    const allProbes: ProbeOutcome[] = (
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

    it('skips only when the probe is ok and every member is breaching or healthy', () => {
      for (const verdicts of verdictLists) {
        for (const probe of allProbes) {
          const { decision } = classifyDetection({
            memberships: verdicts.map(member),
            probe,
          });
          const everyMemberJudged =
            verdicts.length > 0 &&
            verdicts.every((verdict) => toMemberState(verdict) !== 'unjudged');
          if (decision === 'skip') {
            expect(probe.status).toBe('ok');
            expect(everyMemberJudged).toBe(true);
          }
        }
      }
    });

    it('never skips a member whose state disagrees with the fresh rows', () => {
      for (const verdicts of verdictLists) {
        for (const probe of allProbes) {
          const { decision } = classifyDetection({ memberships: verdicts.map(member), probe });
          const states = verdicts.map(toMemberState);
          const disagrees =
            (probe.hasRows && states.includes('healthy')) ||
            (!probe.hasRows && states.includes('breaching'));
          if (probe.status === 'ok' && disagrees) {
            expect(decision).toBe('needs_agent');
          }
        }
      }
    });
  });
});
