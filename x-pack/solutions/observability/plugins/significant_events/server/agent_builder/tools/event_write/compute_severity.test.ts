/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry } from '@kbn/significant-events-schema';
import { CRITICAL_SEVERITY_THRESHOLD } from '@kbn/significant-events-schema';
import { computeSeverity, deriveEventImpact } from './compute_severity';

const makeSignal = (overrides: Partial<SignalEntry> & { ruleUuid?: string } = {}): SignalEntry => {
  const { ruleUuid = 'rule-1', ...rest } = overrides;
  return {
    type: 'detection',
    stream_name: 'logs.test',
    description: 'Found: payment refused. Impact: checkout blocked.',
    verdict: 'confirms',
    metadata: {
      detection_id: `det-${ruleUuid}`,
      rule_uuid: ruleUuid,
      change_point_type: 'spike',
      p_value: 0.01,
      severity_score: 65,
    },
    ...rest,
  } as SignalEntry;
};

const makeScoredSignal = (ruleUuid: string, impact: SignalEntry['impact'], score: number) =>
  makeSignal({
    ruleUuid,
    impact,
    metadata: {
      detection_id: `det-${ruleUuid}`,
      rule_uuid: ruleUuid,
      change_point_type: 'spike',
      p_value: 0.01,
      severity_score: score,
    },
  } as Partial<SignalEntry>);

describe('deriveEventImpact', () => {
  it('returns "none" with no severity score when no signal is classified', () => {
    expect(deriveEventImpact([makeSignal()])).toEqual({
      impact: 'none',
      severityScore: undefined,
    });
  });

  it('picks the worst impact across signals: exposed > blocked > degraded > none', () => {
    const signals = [
      makeSignal({ ruleUuid: 'r1', impact: 'degraded' }),
      makeSignal({ ruleUuid: 'r2', impact: 'none' }),
    ];
    expect(deriveEventImpact(signals).impact).toBe('degraded');

    const withOutage = [...signals, makeSignal({ ruleUuid: 'r3', impact: 'blocked' })];
    expect(deriveEventImpact(withOutage).impact).toBe('blocked');

    const withExposure = [...withOutage, makeSignal({ ruleUuid: 'r4', impact: 'exposed' })];
    expect(deriveEventImpact(withExposure).impact).toBe('exposed');
  });

  it('takes the max severity_score only among signals at the worst impact', () => {
    const signals = [
      makeScoredSignal('r1', 'blocked', 40),
      makeScoredSignal('r2', 'blocked', 85),
      makeScoredSignal('r3', 'degraded', 99),
    ];
    expect(deriveEventImpact(signals).severityScore).toBe(85);
  });

  it('ignores severity_score from off_topic signals while keeping their impact', () => {
    const signals = [
      makeSignal({
        ruleUuid: 'r1',
        verdict: 'off_topic',
        impact: 'blocked',
        metadata: {
          detection_id: 'det-r1',
          rule_uuid: 'r1',
          change_point_type: 'spike',
          p_value: 0.01,
          severity_score: 95,
        },
      } as Partial<SignalEntry>),
    ];
    const derived = deriveEventImpact(signals);
    expect(derived.impact).toBe('blocked');
    expect(derived.severityScore).toBeUndefined();
  });

  it('treats a signal with no impact field as not contributing', () => {
    const signals = [
      { ...makeSignal({ ruleUuid: 'r1' }), impact: undefined },
      makeSignal({ ruleUuid: 'r2', impact: 'degraded' }),
    ];
    expect(deriveEventImpact(signals).impact).toBe('degraded');
  });
});

describe('computeSeverity', () => {
  it('maps "none" to low', () => {
    expect(computeSeverity({ impact: 'none' })).toBe('low');
  });

  it('maps "exposed" to critical', () => {
    expect(computeSeverity({ impact: 'exposed' })).toBe('critical');
  });

  describe('degraded', () => {
    it('is always medium', () => {
      expect(computeSeverity({ impact: 'degraded' })).toBe('medium');
    });

    it('does not escalate on severity_score', () => {
      expect(
        computeSeverity({ impact: 'degraded', severityScore: CRITICAL_SEVERITY_THRESHOLD })
      ).toBe('medium');
    });
  });

  describe('blocked', () => {
    it('is high when severity_score is below the critical threshold', () => {
      expect(
        computeSeverity({ impact: 'blocked', severityScore: CRITICAL_SEVERITY_THRESHOLD - 1 })
      ).toBe('high');
    });

    it('is high when there is no severity_score', () => {
      expect(computeSeverity({ impact: 'blocked' })).toBe('high');
    });

    it('escalates to critical when severity_score meets the threshold', () => {
      expect(
        computeSeverity({ impact: 'blocked', severityScore: CRITICAL_SEVERITY_THRESHOLD })
      ).toBe('critical');
    });
  });
});
