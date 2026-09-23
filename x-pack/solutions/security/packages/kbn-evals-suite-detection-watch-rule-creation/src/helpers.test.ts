/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calculateSetMetrics,
  extractMitreTechniques,
  hasRequiredFields,
  resolveDateMathSeconds,
  validateFromClause,
  validateInterval,
  validateRiskScore,
  validateSeverity,
  tieredTechniqueCredit,
  ordinalMitreF1,
} from './helpers';

describe('extractMitreTechniques', () => {
  it('returns empty set for empty threat array', () => {
    expect(extractMitreTechniques({ threat: [] })).toEqual(new Set());
  });

  it('collects technique and subtechnique IDs', () => {
    const result = extractMitreTechniques({
      threat: [
        {
          technique: [
            { id: 'T1078', subtechnique: [{ id: 'T1078.001' }, { id: 'T1078.003' }] },
            { id: 'T1059' },
          ],
        },
      ],
    });
    expect(result).toEqual(new Set(['T1078', 'T1078.001', 'T1078.003', 'T1059']));
  });

  it('handles missing technique array gracefully', () => {
    expect(extractMitreTechniques({ threat: [{}] })).toEqual(new Set());
  });
});

describe('validateFromClause', () => {
  it('rejects bare FROM *', () => {
    expect(validateFromClause('FROM *').valid).toBe(false);
  });

  it('rejects FROM * with trailing whitespace', () => {
    expect(validateFromClause('FROM *  ').valid).toBe(false);
  });

  it('accepts a specific index pattern', () => {
    expect(validateFromClause('FROM logs-endpoint.events.process-*').valid).toBe(true);
  });

  it('accepts FROM with pipe continuation', () => {
    expect(validateFromClause('FROM logs-* | WHERE event.type == "start"').valid).toBe(true);
  });
});

describe('calculateSetMetrics', () => {
  it('returns perfect score when both sets are empty', () => {
    expect(calculateSetMetrics(new Set(), new Set())).toEqual({ precision: 1, recall: 1, f1: 1 });
  });

  it('returns zero when predicted is empty but expected is not', () => {
    expect(calculateSetMetrics(new Set(), new Set(['T1078']))).toEqual({
      precision: 0,
      recall: 0,
      f1: 0,
    });
  });

  it('returns zero when expected is empty but predicted is not', () => {
    expect(calculateSetMetrics(new Set(['T1078']), new Set())).toEqual({
      precision: 0,
      recall: 0,
      f1: 0,
    });
  });

  it('returns perfect score for exact match', () => {
    const s = new Set(['T1078', 'T1059']);
    expect(calculateSetMetrics(s, s)).toEqual({ precision: 1, recall: 1, f1: 1 });
  });

  it('computes correct F1 for partial overlap', () => {
    const { precision, recall, f1 } = calculateSetMetrics(
      new Set(['T1078', 'T1059']),
      new Set(['T1078', 'T1027'])
    );
    expect(precision).toBeCloseTo(0.5);
    expect(recall).toBeCloseTo(0.5);
    expect(f1).toBeCloseTo(0.5);
  });
});

describe('validateSeverity', () => {
  it.each(['low', 'medium', 'high', 'critical'])('accepts %s', (s) => {
    expect(validateSeverity(s)).toBe(true);
  });

  it('rejects unknown value', () => {
    expect(validateSeverity('urgent')).toBe(false);
  });

  it('rejects non-string', () => {
    expect(validateSeverity(1)).toBe(false);
  });
});

describe('validateRiskScore', () => {
  it('accepts 0 and 100', () => {
    expect(validateRiskScore(0)).toBe(true);
    expect(validateRiskScore(100)).toBe(true);
  });

  it('rejects out-of-range values', () => {
    expect(validateRiskScore(-1)).toBe(false);
    expect(validateRiskScore(101)).toBe(false);
  });

  it('rejects non-numbers', () => {
    expect(validateRiskScore('50')).toBe(false);
    expect(validateRiskScore(null)).toBe(false);
  });
});

describe('validateInterval', () => {
  it.each(['5m', '1h', '30s', '7d'])('accepts %s', (i) => {
    expect(validateInterval(i)).toBe(true);
  });

  it('rejects missing unit', () => {
    expect(validateInterval('5')).toBe(false);
  });

  it('rejects invalid unit', () => {
    expect(validateInterval('5w')).toBe(false);
  });

  it('rejects non-string', () => {
    expect(validateInterval(5)).toBe(false);
  });
});

describe('resolveDateMathSeconds', () => {
  const now = new Date('2024-01-01T00:00:00.000Z');

  it('resolves now-5m correctly', () => {
    const result = resolveDateMathSeconds('now-5m', now);
    expect(result).toBeCloseTo((now.getTime() - 5 * 60_000) / 1000, 0);
  });

  it('returns null for non-string', () => {
    expect(resolveDateMathSeconds(null, now)).toBeNull();
    expect(resolveDateMathSeconds(42, now)).toBeNull();
  });
});

describe('hasRequiredFields', () => {
  it('returns full coverage when all fields are present', () => {
    const result = hasRequiredFields({
      name: 'My Rule',
      description: 'desc',
      query: 'FROM logs-*',
      severity: 'high',
      tags: ['tag'],
      risk_score: 50,
    });
    expect(result.coverage).toBe(1);
    expect(result.missing).toEqual([]);
  });

  it('counts empty string as missing', () => {
    const { missing } = hasRequiredFields({
      name: '',
      description: 'x',
      query: 'q',
      severity: 'low',
      tags: ['t'],
      risk_score: 1,
    });
    expect(missing).toContain('name');
  });

  it('counts empty array as missing', () => {
    const { missing } = hasRequiredFields({
      name: 'n',
      description: 'x',
      query: 'q',
      severity: 'low',
      tags: [],
      risk_score: 1,
    });
    expect(missing).toContain('tags');
  });
});

describe('ordinal MITRE credit (tieredTechniqueCredit / ordinalMitreF1)', () => {
  it('exact sub-technique match earns full credit', () => {
    expect(tieredTechniqueCredit('T1078.001', new Set(['T1078.001']))).toEqual({
      credit: 1,
      kind: 'exact',
    });
  });

  it('parent technique earns HALF credit — the mutation-sensitive tier', () => {
    expect(tieredTechniqueCredit('T1078.001', new Set(['T1078'])).credit).toBe(0.5);
    expect(tieredTechniqueCredit('T1078.001', new Set(['T1078'])).kind).toBe('parent');
  });

  it('wrong technique earns zero, not partial', () => {
    expect(tieredTechniqueCredit('T1078.001', new Set(['T1059']))).toEqual({
      credit: 0,
      kind: 'miss',
    });
  });

  it('empty generated set is a miss', () => {
    expect(tieredTechniqueCredit('T1078.001', new Set())).toEqual({ credit: 0, kind: 'miss' });
  });

  it('ordinalMitreF1 separates close from wrong where exact-F1 cannot', () => {
    // expected {T1548.002}; arm A returns parent {T1548}; arm B returns garbage {T1059}
    const closeArm = ordinalMitreF1(new Set(['T1548']), new Set(['T1548.002']));
    const wrongArm = ordinalMitreF1(new Set(['T1059']), new Set(['T1548.002']));
    expect(closeArm.f1).toBeGreaterThan(wrongArm.f1);
    expect(closeArm.f1).toBeGreaterThan(0);
    expect(wrongArm.f1).toBe(0);
  });

  it('exact IDs keep the historical 1.0 ceiling (continuity with build-461 numbers)', () => {
    const r = ordinalMitreF1(new Set(['T1078.001']), new Set(['T1078.001']));
    expect(r.f1).toBe(1);
  });
});
