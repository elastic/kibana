/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMPTY_DETONATION_FILTERS,
  hasActiveFilters,
  toArray,
  toBreakdownCounts,
  toDetonationSummary,
  toFamilyCounts,
  toHighestSeverity,
  toProtections,
  toRuleNamesByFamily,
} from './transforms';

describe('toArray', () => {
  it('wraps the scalar ES|QL returns for a single value', () => {
    expect(toArray('behavior')).toEqual(['behavior']);
  });

  it('passes through the array ES|QL returns for a multivalue', () => {
    expect(toArray(['behavior', 'malicious_file'])).toEqual(['behavior', 'malicious_file']);
  });

  it('returns an empty array for a missing value', () => {
    expect(toArray(null)).toEqual([]);
    expect(toArray(undefined)).toEqual([]);
  });

  it('drops non-string entries', () => {
    expect(toArray(['behavior', 3, null])).toEqual(['behavior']);
  });
});

describe('toProtections', () => {
  it('orders protections consistently regardless of the order returned', () => {
    expect(toProtections(['behavior', 'ransomware', 'malicious_file'])).toEqual([
      'malicious_file',
      'behavior',
      'ransomware',
    ]);
  });

  it('de-duplicates repeated event codes', () => {
    expect(toProtections(['behavior', 'behavior'])).toEqual(['behavior']);
  });

  it('ignores event codes that are not known protections', () => {
    expect(toProtections(['behavior', 'something_else'])).toEqual(['behavior']);
  });

  it('returns an empty array when no protection fired', () => {
    expect(toProtections(null)).toEqual([]);
  });
});

describe('toHighestSeverity', () => {
  it('returns the highest severity present', () => {
    expect(toHighestSeverity(['low', 'high', 'medium'])).toEqual('high');
  });

  it('handles the scalar returned for a single severity', () => {
    expect(toHighestSeverity('medium')).toEqual('medium');
  });

  it('returns null when only endpoint protections fired, since they carry no rule severity', () => {
    expect(toHighestSeverity(null)).toBeNull();
  });

  it('ignores unrecognised severities', () => {
    expect(toHighestSeverity(['bogus'])).toBeNull();
  });
});

describe('toDetonationSummary', () => {
  const record = {
    timestamp: '2026-05-14T19:38:05.539Z',
    taskId: '15ec4d79-deff-4d74-98b9-c9bfbc5940ce',
    sampleHash: '4c542af8bc52a8333680b8c5a715c0c6c019fc284275410ba066d6af7947d193',
    sampleExtension: 'elf',
    osFamily: 'linux',
    architecture: 'x86_64',
    agentId: 'agent-1',
    agentVersion: '8.19.0',
    source: 'virtustotal',
    tags: ['source-bifrost', 'team-trade'],
    endpointAlertsCount: 4,
    detectionAlertsCount: 2,
    ruleNames: ['Linux.Trojan.Gafgyt', 'Suspicious Remote Memory Allocation'],
    eventCodes: ['behavior', 'malicious_file'],
    severities: ['low', 'medium'],
  };

  it('derives families and categories from signature rule names only', () => {
    const summary = toDetonationSummary(record);

    expect(summary.families).toEqual(['Gafgyt']);
    expect(summary.categories).toEqual(['Trojan']);
  });

  it('derives the platform, protections and highest severity', () => {
    const summary = toDetonationSummary(record);

    expect(summary.platform).toEqual('Linux/x86_64');
    expect(summary.protections).toEqual(['malicious_file', 'behavior']);
    expect(summary.highestSeverity).toEqual('medium');
  });

  it('labels the kernel name the sandbox records for macOS', () => {
    expect(toDetonationSummary({ ...record, osFamily: 'darwin' }).platform).toEqual('macOS/x86_64');
  });

  it('keeps the raw osFamily for filtering even though the label is friendly', () => {
    expect(toDetonationSummary({ ...record, osFamily: 'darwin' }).osFamily).toEqual('darwin');
  });

  it('marks the architecture as unknown when the task did not record one', () => {
    expect(toDetonationSummary({ ...record, architecture: null }).platform).toEqual('Linux/?');
  });

  it('falls back to an em dash when neither OS nor architecture is known', () => {
    expect(toDetonationSummary({ ...record, osFamily: null, architecture: null }).platform).toEqual(
      '—'
    );
  });

  it('defaults absent alert counts to zero', () => {
    const summary = toDetonationSummary({
      ...record,
      endpointAlertsCount: null,
      detectionAlertsCount: null,
    });

    expect(summary.endpointAlertsCount).toEqual(0);
    expect(summary.detectionAlertsCount).toEqual(0);
  });
});

describe('toFamilyCounts', () => {
  it('folds rule names into families and sorts by count', () => {
    expect(
      toFamilyCounts(
        [
          { ruleName: 'Linux.Trojan.Gafgyt', count: 351 },
          { ruleName: 'Windows.Trojan.Vidar', count: 31 },
          { ruleName: 'Suspicious Remote Memory Allocation', count: 106 },
          { ruleName: 'Linux.Generic.Threat', count: 129 },
        ],
        10
      )
    ).toEqual([
      { family: 'Gafgyt', category: 'Trojan', count: 351 },
      { family: 'Vidar', category: 'Trojan', count: 31 },
    ]);
  });

  it('sums counts for a family detected on more than one platform', () => {
    expect(
      toFamilyCounts(
        [
          { ruleName: 'Windows.Cryptominer.Xmrig', count: 3 },
          { ruleName: 'Multi.Cryptominer.Xmrig', count: 4 },
        ],
        10
      )
    ).toEqual([{ family: 'Xmrig', category: 'Cryptominer', count: 7 }]);
  });

  it('applies the limit', () => {
    const records = [
      { ruleName: 'Linux.Trojan.A', count: 3 },
      { ruleName: 'Linux.Trojan.B', count: 2 },
      { ruleName: 'Linux.Trojan.C', count: 1 },
    ];

    expect(toFamilyCounts(records, 2).map(({ family }) => family)).toEqual(['A', 'B']);
  });

  it('returns nothing when no rule name names a family', () => {
    expect(
      toFamilyCounts([{ ruleName: 'RunDLL32 with Unusual Arguments', count: 76 }], 10)
    ).toEqual([]);
  });
});

describe('toBreakdownCounts', () => {
  it('maps stats rows onto bars sorted by count', () => {
    expect(
      toBreakdownCounts(
        [
          { eventCode: 'behavior', count: 12 },
          { eventCode: 'malicious_file', count: 40 },
        ],
        'eventCode'
      )
    ).toEqual([
      { key: 'malicious_file', count: 40 },
      { key: 'behavior', count: 12 },
    ]);
  });

  it('drops rows whose key is missing', () => {
    expect(toBreakdownCounts([{ osFamily: null, count: 5 }], 'osFamily')).toEqual([]);
  });
});

describe('hasActiveFilters', () => {
  it('ignores the two default toggles, which are on out of the box', () => {
    expect(hasActiveFilters(EMPTY_DETONATION_FILTERS)).toBe(false);
  });

  it('reports whitespace-only hash searches as inactive', () => {
    expect(hasActiveFilters({ ...EMPTY_DETONATION_FILTERS, hash: '   ' })).toBe(false);
  });

  it('reports a selection in any dimension', () => {
    expect(hasActiveFilters({ ...EMPTY_DETONATION_FILTERS, platforms: ['linux'] })).toBe(true);
  });
});

describe('toRuleNamesByFamily', () => {
  it('groups the per-platform rule names that name one family', () => {
    const byFamily = toRuleNamesByFamily([
      { ruleName: 'Windows.Cryptominer.Xmrig', count: 3 },
      { ruleName: 'Multi.Cryptominer.Xmrig', count: 4 },
      { ruleName: 'Linux.Trojan.Gafgyt', count: 1 },
    ]);

    expect(byFamily.get('Xmrig')).toEqual(['Windows.Cryptominer.Xmrig', 'Multi.Cryptominer.Xmrig']);
    expect(byFamily.get('Gafgyt')).toEqual(['Linux.Trojan.Gafgyt']);
  });

  it('ignores rule names that name no family', () => {
    expect(toRuleNamesByFamily([{ ruleName: 'RunDLL32 with Unusual Arguments' }]).size).toEqual(0);
  });
});
