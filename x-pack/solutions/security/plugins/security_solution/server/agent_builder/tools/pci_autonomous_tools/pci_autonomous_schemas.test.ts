/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unit tests for the autonomously-authored zod schemas, the ScopeClaim builder,
 * and the provenance constants surfaced in every autonomous tool result.
 *
 * These cover the public surface of `pci_autonomous_schemas.ts` and the
 * security-critical behaviours that the input-validation layer guarantees
 * — chiefly that the index-pattern regex cannot be tricked into accepting
 * FROM-injection metacharacters, and that the time-range refinement rejects
 * future-dated `to` values and inverted ranges before any ES|QL is issued.
 */

import {
  AUTONOMOUS_PCI_DSS_VERSION,
  AUTONOMOUS_PCI_QSA_DISCLAIMER,
  AUTONOMOUS_SCOPE_PROVENANCE,
  buildAutonomousDiscoveryClaim,
  buildAutonomousScopeClaim,
  pciAutonomousIndexPatternSchema,
  pciAutonomousRequirementIdSchema,
  pciAutonomousTimeRangeSchema,
} from './pci_autonomous_schemas';

describe('AUTONOMOUS_* constants', () => {
  it('pins the PCI DSS version to v4.0.1 (v4.0 retired 2024-12-31)', () => {
    expect(AUTONOMOUS_PCI_DSS_VERSION).toBe('4.0.1');
  });

  it('QSA disclaimer mentions QSA + audit + the autonomous variant phrasing', () => {
    expect(AUTONOMOUS_PCI_QSA_DISCLAIMER).toMatch(/Qualified Security Assessor \(QSA\)/);
    expect(AUTONOMOUS_PCI_QSA_DISCLAIMER).toMatch(/PCI DSS v4\.0\.1/);
    expect(AUTONOMOUS_PCI_QSA_DISCLAIMER).toMatch(/INPUT to/);
  });

  it('provenance block exposes the fields a trace reviewer needs to distinguish variants', () => {
    expect(AUTONOMOUS_SCOPE_PROVENANCE).toMatchObject({
      evaluator: 'autonomous',
      architectVersion: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    });
    expect(typeof AUTONOMOUS_SCOPE_PROVENANCE.cycleId).toBe('number');
  });
});

describe('pciAutonomousIndexPatternSchema', () => {
  it('accepts common single-token patterns', () => {
    for (const candidate of [
      'logs-*',
      'logs-endpoint.events.*',
      'my-index_v1',
      'a.b.c',
      'endgame-*',
      '*',
    ]) {
      expect(() => pciAutonomousIndexPatternSchema.parse(candidate)).not.toThrow();
    }
  });

  it('accepts a cross-cluster (remote:index) pattern', () => {
    expect(() => pciAutonomousIndexPatternSchema.parse('remote_cluster:logs-*')).not.toThrow();
  });

  it('rejects empty / whitespace / control characters', () => {
    for (const bad of ['', ' ', ' logs-*', 'logs-* ', 'logs\tindex', 'logs\nindex']) {
      expect(() => pciAutonomousIndexPatternSchema.parse(bad)).toThrow();
    }
  });

  it('rejects patterns starting with characters reserved for ES (-, ., _, etc.)', () => {
    for (const bad of ['-bad', '.bad', '_bad', '+bad']) {
      expect(() => pciAutonomousIndexPatternSchema.parse(bad)).toThrow();
    }
  });

  it('rejects FROM-injection metacharacters that ES|QL would treat as syntax', () => {
    for (const bad of [
      'logs-*; DROP',
      'logs-*, FROM-something',
      'logs-* | LIMIT 1',
      'logs-* OR 1=1',
      'logs-*(/)',
    ]) {
      expect(() => pciAutonomousIndexPatternSchema.parse(bad)).toThrow();
    }
  });

  it('enforces the 1..255 length bounds', () => {
    expect(() => pciAutonomousIndexPatternSchema.parse('a'.repeat(255))).not.toThrow();
    expect(() => pciAutonomousIndexPatternSchema.parse('a'.repeat(256))).toThrow();
  });
});

describe('pciAutonomousTimeRangeSchema', () => {
  const past = '2024-01-01T00:00:00Z';
  const recent = '2024-12-31T23:59:59Z';

  it('accepts a valid from<=to in the past', () => {
    expect(() => pciAutonomousTimeRangeSchema.parse({ from: past, to: recent })).not.toThrow();
  });

  it('accepts from == to (single-point window)', () => {
    expect(() => pciAutonomousTimeRangeSchema.parse({ from: past, to: past })).not.toThrow();
  });

  it('rejects inverted ranges (from > to)', () => {
    expect(() => pciAutonomousTimeRangeSchema.parse({ from: recent, to: past })).toThrow(
      /`from` must be earlier than or equal to `to`/
    );
  });

  it('rejects a `to` more than 48h in the future', () => {
    const farFuture = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();
    expect(() => pciAutonomousTimeRangeSchema.parse({ from: past, to: farFuture })).toThrow(
      /cannot be more than 48 hours in the future/
    );
  });

  it('accepts a `to` exactly inside the 48h horizon', () => {
    const justUnder48h = new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString();
    expect(() =>
      pciAutonomousTimeRangeSchema.parse({ from: past, to: justUnder48h })
    ).not.toThrow();
  });

  it('rejects non-ISO8601 / no-offset strings', () => {
    expect(() => pciAutonomousTimeRangeSchema.parse({ from: 'yesterday', to: 'today' })).toThrow();
    expect(() =>
      pciAutonomousTimeRangeSchema.parse({ from: '2024-01-01', to: '2024-01-02' })
    ).toThrow();
  });
});

describe('pciAutonomousRequirementIdSchema', () => {
  it('accepts "all", every top-level (1..12), and dotted sub-requirements', () => {
    for (const id of ['all', '1', '7', '12', '8.3.4', '10.2.1', '11.6']) {
      expect(() => pciAutonomousRequirementIdSchema.parse(id)).not.toThrow();
    }
  });

  it('rejects ids outside the catalog range and obvious garbage', () => {
    for (const id of ['0', '13', '20', 'eight', '8-3-4', 'all.1', '', '8.3.4.5']) {
      expect(() => pciAutonomousRequirementIdSchema.parse(id)).toThrow();
    }
  });
});

describe('buildAutonomousScopeClaim', () => {
  const baseArgs = {
    indices: ['logs-*', 'logs-*', 'endgame-*'],
    from: '2024-01-01T00:00:00Z',
    to: '2024-01-08T00:00:00Z',
    requirementsEvaluated: ['8.3.4', '8.3.4', '1'],
    requiredFieldsChecked: ['user.name', '@timestamp', 'user.name'],
  };

  it('dedupes and sorts indices + required fields + requirements', () => {
    const claim = buildAutonomousScopeClaim(baseArgs);
    expect(claim.indices).toEqual(['endgame-*', 'logs-*']);
    expect(claim.requirementsEvaluated).toEqual(['1', '8.3.4']);
    expect(claim.requiredFieldsChecked).toEqual(['@timestamp', 'user.name']);
  });

  it('pins DSS version, provenance, and disclaimer onto every claim', () => {
    const claim = buildAutonomousScopeClaim(baseArgs);
    expect(claim.pciDssVersion).toBe(AUTONOMOUS_PCI_DSS_VERSION);
    expect(claim.provenance).toBe(AUTONOMOUS_SCOPE_PROVENANCE);
    expect(claim.disclaimer).toBe(AUTONOMOUS_PCI_QSA_DISCLAIMER);
  });

  it('preserves the caller-supplied time range verbatim', () => {
    const claim = buildAutonomousScopeClaim(baseArgs);
    expect(claim.timeRange).toEqual({
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-08T00:00:00Z',
    });
  });

  it('produces a stable shape across repeat calls with shuffled inputs', () => {
    const shuffled = buildAutonomousScopeClaim({
      ...baseArgs,
      indices: ['endgame-*', 'logs-*', 'logs-*'],
      requirementsEvaluated: ['1', '8.3.4'],
      requiredFieldsChecked: ['@timestamp', 'user.name'],
    });
    const original = buildAutonomousScopeClaim(baseArgs);
    expect(shuffled).toEqual(original);
  });
});

describe('buildAutonomousDiscoveryClaim', () => {
  const baseArgs = {
    indices: ['logs-*', 'logs-*', 'endgame-*'],
    discoveredAt: '2024-06-15T12:30:00Z',
    fieldHintsInspected: ['user.name', '@timestamp', 'user.name'],
  };

  it('dedupes and sorts indices + fieldHintsInspected', () => {
    const claim = buildAutonomousDiscoveryClaim(baseArgs);
    expect(claim.indices).toEqual(['endgame-*', 'logs-*']);
    expect(claim.fieldHintsInspected).toEqual(['@timestamp', 'user.name']);
  });

  it('pins DSS version, provenance, and disclaimer onto every claim', () => {
    const claim = buildAutonomousDiscoveryClaim(baseArgs);
    expect(claim.pciDssVersion).toBe(AUTONOMOUS_PCI_DSS_VERSION);
    expect(claim.provenance).toBe(AUTONOMOUS_SCOPE_PROVENANCE);
    expect(claim.disclaimer).toBe(AUTONOMOUS_PCI_QSA_DISCLAIMER);
  });

  it('preserves the point-in-time `discoveredAt` instant verbatim (no window semantics)', () => {
    const claim = buildAutonomousDiscoveryClaim(baseArgs);
    expect(claim.discoveredAt).toBe('2024-06-15T12:30:00Z');
    // Discovery is a point-in-time snapshot, not a time-bounded scope. The
    // payload deliberately does not carry a `timeRange` or
    // `requirementsEvaluated` field — those belong on the requirement-level
    // ScopeClaim returned by the check / scorecard tools.
    expect((claim as { timeRange?: unknown }).timeRange).toBeUndefined();
    expect((claim as { requirementsEvaluated?: unknown }).requirementsEvaluated).toBeUndefined();
  });

  it('produces a stable shape across repeat calls with shuffled inputs', () => {
    const shuffled = buildAutonomousDiscoveryClaim({
      ...baseArgs,
      indices: ['endgame-*', 'logs-*', 'logs-*'],
      fieldHintsInspected: ['@timestamp', 'user.name'],
    });
    const original = buildAutonomousDiscoveryClaim(baseArgs);
    expect(shuffled).toEqual(original);
  });
});
