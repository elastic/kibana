/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PCI_AUTOMATED_ASSESSMENT_DISCLAIMER,
  PCI_DSS_VERSION,
  buildScopeClaim,
  pciIndexPatternSchema,
  pciRequirementIdSchema,
  pciTimeRangeSchema,
} from './pci_compliance_schemas';

describe('pciIndexPatternSchema', () => {
  it.each(['logs-*', 'metrics-*', 'cluster-a:logs-pci-*', 'logs-custom.myapp-2024.01'])(
    'accepts %j',
    (value) => {
      expect(pciIndexPatternSchema.safeParse(value).success).toBe(true);
    }
  );

  it.each([
    '',
    ' logs-*',
    'logs-*"; DROP INDEX',
    'logs-*\n| FROM malicious',
    'logs-*\t| LIMIT 1',
    'logs-* | LIMIT 1',
    '../escape',
    'logs-*#frag',
    'bad\u0000index',
    'logs-*,metrics-*',
    // 256 chars -> exceeds max
    'a'.repeat(256),
  ])('rejects %j', (value) => {
    expect(pciIndexPatternSchema.safeParse(value).success).toBe(false);
  });
});

describe('pciTimeRangeSchema', () => {
  it('accepts a valid ISO-8601 range with offset', () => {
    expect(
      pciTimeRangeSchema.safeParse({
        from: '2024-01-01T00:00:00Z',
        to: '2024-02-01T00:00:00+02:00',
      }).success
    ).toBe(true);
  });

  it('accepts from === to', () => {
    expect(
      pciTimeRangeSchema.safeParse({
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-01T00:00:00Z',
      }).success
    ).toBe(true);
  });

  it('rejects a non-ISO string', () => {
    expect(pciTimeRangeSchema.safeParse({ from: 'yesterday', to: 'now' }).success).toBe(false);
  });

  it('rejects when `from` is after `to`', () => {
    expect(
      pciTimeRangeSchema.safeParse({
        from: '2024-02-01T00:00:00Z',
        to: '2024-01-01T00:00:00Z',
      }).success
    ).toBe(false);
  });
});

describe('pciRequirementIdSchema', () => {
  it('accepts "all"', () => {
    expect(pciRequirementIdSchema.safeParse('all').success).toBe(true);
  });

  it('accepts a top-level requirement id', () => {
    expect(pciRequirementIdSchema.safeParse('8').success).toBe(true);
  });

  it('rejects made-up ids', () => {
    expect(pciRequirementIdSchema.safeParse('99').success).toBe(false);
    expect(pciRequirementIdSchema.safeParse('drop').success).toBe(false);
  });
});

describe('buildScopeClaim', () => {
  it('pins the DSS version and attaches the QSA disclaimer', () => {
    const claim = buildScopeClaim({
      indices: ['logs-*'],
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-08T00:00:00Z',
      requirementsEvaluated: ['8', '8'],
      requiredFieldsChecked: ['user.name', 'event.outcome', 'user.name'],
    });
    expect(claim.pciDssVersion).toBe(PCI_DSS_VERSION);
    expect(claim.pciDssVersion).toBe('4.0.1');
    expect(claim.disclaimer).toBe(PCI_AUTOMATED_ASSESSMENT_DISCLAIMER);
  });

  it('deduplicates and sorts requirementsEvaluated + requiredFieldsChecked', () => {
    const claim = buildScopeClaim({
      indices: ['logs-*'],
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-02T00:00:00Z',
      requirementsEvaluated: ['10', '8', '8', '1'],
      requiredFieldsChecked: ['user.name', 'event.outcome', 'user.name', '@timestamp'],
    });
    expect(claim.requirementsEvaluated).toEqual(['1', '10', '8']);
    expect(claim.requiredFieldsChecked).toEqual(['@timestamp', 'event.outcome', 'user.name']);
  });
});
