/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BlastRadiusEntry, SignalEntry } from '@kbn/significant-events-schema';
import { CRITICAL_SEVERITY_THRESHOLD } from '@kbn/significant-events-schema';
import {
  BREADTH_THRESHOLD,
  computeSeverity,
  deriveEventEffect,
  TOPOLOGY_FAN_OUT_THRESHOLD,
} from './compute_severity';
import { computeTopologyFanOut } from './topology_breadth';

const makeSignal = (overrides: Partial<SignalEntry> & { ruleUuid?: string } = {}): SignalEntry => {
  const { ruleUuid = 'rule-1', ...rest } = overrides;
  return {
    type: 'detection',
    source_id: 'logs.test',
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

describe('deriveEventEffect', () => {
  it('returns "none" with no paths or severity score when no signal is classified', () => {
    expect(deriveEventEffect([makeSignal()])).toEqual({
      effect: 'none',
      outagePaths: [],
      severityScore: undefined,
    });
  });

  it('picks the worst effect across signals: exposure > outage > degradation > none', () => {
    const signals = [
      makeSignal({ ruleUuid: 'r1', effect: 'degradation' }),
      makeSignal({ ruleUuid: 'r2', effect: 'none' }),
    ];
    expect(deriveEventEffect(signals).effect).toBe('degradation');

    const withOutage = [
      ...signals,
      makeSignal({ ruleUuid: 'r3', effect: 'outage', outage_paths: ['checkout'] }),
    ];
    expect(deriveEventEffect(withOutage).effect).toBe('outage');

    const withExposure = [...withOutage, makeSignal({ ruleUuid: 'r4', effect: 'exposure' })];
    expect(deriveEventEffect(withExposure).effect).toBe('exposure');
  });

  it('unions outage_paths across every signal at the worst effect, deduped', () => {
    const signals = [
      makeSignal({ ruleUuid: 'r1', effect: 'outage', outage_paths: ['checkout'] }),
      makeSignal({ ruleUuid: 'r2', effect: 'outage', outage_paths: ['balance', 'checkout'] }),
    ];
    const result = deriveEventEffect(signals);
    expect(result.effect).toBe('outage');
    expect(result.outagePaths.sort()).toEqual(['balance', 'checkout']);
  });

  it('ignores outage_paths from a signal that is not at the worst effect', () => {
    const signals = [
      makeSignal({ ruleUuid: 'r1', effect: 'outage', outage_paths: ['checkout'] }),
      makeSignal({ ruleUuid: 'r2', effect: 'exposure' }),
    ];
    const result = deriveEventEffect(signals);
    expect(result.effect).toBe('exposure');
    expect(result.outagePaths).toEqual([]);
  });

  it('takes the max severity_score only among signals at the worst effect', () => {
    const signals = [
      makeSignal({
        ruleUuid: 'r1',
        effect: 'outage',
        outage_paths: ['checkout'],
        metadata: {
          detection_id: 'det-r1',
          rule_uuid: 'r1',
          change_point_type: 'spike',
          p_value: 0.01,
          severity_score: 40,
        },
      } as Partial<SignalEntry>),
      makeSignal({
        ruleUuid: 'r2',
        effect: 'outage',
        outage_paths: ['checkout'],
        metadata: {
          detection_id: 'det-r2',
          rule_uuid: 'r2',
          change_point_type: 'spike',
          p_value: 0.01,
          severity_score: 85,
        },
      } as Partial<SignalEntry>),
      makeSignal({ ruleUuid: 'r3', effect: 'degradation' }),
    ];
    expect(deriveEventEffect(signals).severityScore).toBe(85);
  });

  it('treats a signal with no effect field as not contributing', () => {
    const signals = [
      { ...makeSignal({ ruleUuid: 'r1' }), effect: undefined },
      makeSignal({ ruleUuid: 'r2', effect: 'degradation' }),
    ];
    expect(deriveEventEffect(signals).effect).toBe('degradation');
  });
});

const base = {
  outagePaths: [] as string[],
  breadth: 0,
  topologyFanOut: 0,
  hasCascadePath: false,
};

describe('computeSeverity', () => {
  it('maps "none" to low', () => {
    expect(computeSeverity({ ...base, effect: 'none' })).toBe('low');
  });

  it('maps "exposure" to critical regardless of breadth, paths, fan-out, or cascade', () => {
    expect(computeSeverity({ ...base, effect: 'exposure' })).toBe('critical');
  });

  describe('degradation', () => {
    it.each([0, BREADTH_THRESHOLD])('breadth %i and no cascade path → medium', (breadth) => {
      expect(computeSeverity({ ...base, effect: 'degradation', breadth })).toBe('medium');
    });

    it('breadth beyond the threshold → high', () => {
      expect(
        computeSeverity({ ...base, effect: 'degradation', breadth: BREADTH_THRESHOLD + 1 })
      ).toBe('high');
    });

    it('a cascade path → high even at breadth 0', () => {
      expect(computeSeverity({ ...base, effect: 'degradation', hasCascadePath: true })).toBe(
        'high'
      );
    });

    it('does not consult severity_score or fan-out', () => {
      expect(
        computeSeverity({
          ...base,
          effect: 'degradation',
          severityScore: CRITICAL_SEVERITY_THRESHOLD,
          topologyFanOut: TOPOLOGY_FAN_OUT_THRESHOLD,
        })
      ).toBe('medium');
    });
  });

  describe('outage', () => {
    const single = { ...base, effect: 'outage' as const, outagePaths: ['checkout'] };

    it('>=2 distinct paths → critical regardless of score, breadth, fan-out, or cascade', () => {
      expect(
        computeSeverity({ ...base, effect: 'outage', outagePaths: ['balance', 'history'] })
      ).toBe('critical');
    });

    it('a single path with severity_score in the critical band → critical', () => {
      expect(computeSeverity({ ...single, severityScore: CRITICAL_SEVERITY_THRESHOLD })).toBe(
        'critical'
      );
    });

    it('a single path below the critical severity_score → high', () => {
      expect(computeSeverity({ ...single, severityScore: CRITICAL_SEVERITY_THRESHOLD - 1 })).toBe(
        'high'
      );
    });

    it('a single path with fan-out at the threshold → critical (§2 diagram: fan-out ≥ threshold)', () => {
      expect(computeSeverity({ ...single, topologyFanOut: TOPOLOGY_FAN_OUT_THRESHOLD })).toBe(
        'critical'
      );
    });

    it('a single path with fan-out below the threshold → high', () => {
      expect(computeSeverity({ ...single, topologyFanOut: TOPOLOGY_FAN_OUT_THRESHOLD - 1 })).toBe(
        'high'
      );
    });

    it('one caller with unrelated targets remains high', () => {
      const dependencies: BlastRadiusEntry[] = [
        {
          type: 'dependency',
          feature_id: 'postgres',
          source: 'orders-api',
          target: 'postgres',
          source_id: 'logs.orders',
        },
        {
          type: 'dependency',
          feature_id: 'redis',
          source: 'orders-api',
          target: 'redis',
          source_id: 'logs.orders',
        },
      ];

      expect(
        computeSeverity({ ...single, topologyFanOut: computeTopologyFanOut(dependencies) })
      ).toBe('high');
    });

    it('a single path with no score and no fan-out → high', () => {
      expect(computeSeverity(single)).toBe('high');
    });

    it('breadth and cascade are not outage-branch inputs', () => {
      expect(
        computeSeverity({ ...single, breadth: BREADTH_THRESHOLD + 5, hasCascadePath: true })
      ).toBe('high');
    });

    it('an empty paths list → high (defensive default)', () => {
      expect(computeSeverity({ ...base, effect: 'outage' })).toBe('high');
    });
  });
});
