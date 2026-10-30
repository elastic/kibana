/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HuntIncompleteReason } from '@kbn/alertzero-common';
import {
  GAP_REASON_PHRASES,
  dedupeCoverageGaps,
  describeGap,
  describeGaps,
  gapCountPhrase,
} from './dedupe_coverage_gaps';

describe('GAP_REASON_PHRASES', () => {
  it('has a phrase for every reason a hunt can report', () => {
    expect(Object.keys(GAP_REASON_PHRASES).sort()).toEqual(
      [...HuntIncompleteReason.options].sort()
    );
  });
});

describe('dedupeCoverageGaps', () => {
  const gap = { reason: 'input_truncated', detail: 'only the first 50 IOCs were hunted' };

  it('keeps the first of identical gaps and preserves order', () => {
    const { gaps } = dedupeCoverageGaps([
      { reason: 'unknown_technique_id', detail: 'a', technique_id: 'T1' },
      gap,
      { ...gap },
      { reason: 'unknown_technique_id', detail: 'a', technique_id: 'T2' },
    ]);
    expect(gaps.map((entry) => entry.technique_id ?? entry.reason)).toEqual([
      'T1',
      'input_truncated',
      'T2',
    ]);
  });

  it('treats an absent input as no gaps', () => {
    expect(dedupeCoverageGaps(undefined)).toEqual({ gaps: [], atLeast: false });
  });

  it('truncates an overlong detail and technique id', () => {
    const { gaps } = dedupeCoverageGaps([
      {
        reason: 'unknown_technique_id',
        detail: 'word '.repeat(100),
        technique_id: 'T'.repeat(500),
      },
    ]);
    expect(gaps[0].detail.length).toBeLessThanOrEqual(200);
    expect(gaps[0].technique_id?.length).toBeLessThanOrEqual(64);
  });

  it('flags a list that arrived at the cap as a lower bound', () => {
    const input = Array.from({ length: 100 }, (_, index) => ({
      reason: 'collapsed',
      detail: `d${index}`,
    }));
    const deduped = dedupeCoverageGaps(input);
    expect(deduped.atLeast).toBe(true);
    expect(gapCountPhrase(deduped)).toBe('at least 100 gaps');
  });
});

describe('describeGap', () => {
  it('names the technique and the reason for a technique-scoped gap', () => {
    expect(
      describeGap({ reason: 'unknown_technique_id', detail: 'ignored', technique_id: 'T1059' })
    ).toBe('T1059 (unknown technique id)');
  });

  it('falls back to the detail for an unknown technique id with no technique', () => {
    expect(describeGap({ reason: 'unknown_technique_id', detail: 'T9999' })).toBe(
      'T9999 (unknown technique id)'
    );
  });

  it('shows the phrase alone for a whole-search gap and never its detail', () => {
    expect(describeGap({ reason: 'input_truncated', detail: 'secret detail' })).toBe(
      'input truncated'
    );
  });

  it('falls back to the raw reason for one it does not know', () => {
    expect(describeGap({ reason: 'brand_new_reason', detail: 'x' })).toBe('brand new reason');
  });

  it('collapses identical phrases, since the count already says how many gaps there were', () => {
    const deduped = dedupeCoverageGaps([
      { reason: 'input_truncated', detail: 'a' },
      { reason: 'input_truncated', detail: 'b' },
    ]);
    expect(describeGaps(deduped)).toBe('input truncated');
  });

  it('cuts at an item boundary and counts the rest when over budget', () => {
    const deduped = dedupeCoverageGaps(
      Array.from({ length: 10 }, (_, index) => ({
        reason: 'unknown_technique_id',
        detail: `T${9000 + index}`,
      }))
    );
    const described = describeGaps(deduped, 100) ?? '';
    expect(described.length).toBeLessThanOrEqual(100);
    expect(described).toMatch(/\(unknown technique id\) \(\+\d+ more\)$/);
  });

  it('describes nothing for no gaps', () => {
    expect(describeGaps({ gaps: [], atLeast: false })).toBeUndefined();
  });
});

describe('gapCountPhrase', () => {
  it('uses the singular for one gap', () => {
    expect(gapCountPhrase({ gaps: [{ reason: 'collapsed', detail: '' }], atLeast: false })).toBe(
      '1 gap'
    );
  });
});
