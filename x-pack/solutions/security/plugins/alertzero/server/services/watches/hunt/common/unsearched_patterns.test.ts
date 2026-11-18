/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_UNSEARCHED_DETAIL_CHARS,
  describeUnsearched,
  unsearchedGaps,
  unsearchedPatterns,
} from './unsearched_patterns';

describe('unsearchedPatterns', () => {
  it('returns names in missing that are absent from index_patterns, once each', () => {
    expect(
      unsearchedPatterns({
        index_patterns: ['logs-*'],
        missing: ['custom-1', 'custom-1', 'logs-*', 'winlogbeat-*'],
      })
    ).toEqual(['custom-1', 'winlogbeat-*']);
  });

  it('returns nothing for a name an exclusion entry covers', () => {
    expect(
      unsearchedPatterns({ index_patterns: ['logs-*', '-logs-foo*'], missing: ['logs-foo-1'] })
    ).toEqual([]);
  });

  it('returns a .ds- name that no exclusion covers', () => {
    expect(
      unsearchedPatterns({
        index_patterns: ['logs-*', '-other*'],
        missing: ['.ds-custom-1-2026.09.30-000001'],
      })
    ).toEqual(['.ds-custom-1-2026.09.30-000001']);
  });
});

describe('describeUnsearched', () => {
  it('names one index', () => {
    expect(describeUnsearched(['custom-edr-1'])).toBe(
      'The default data view names `custom-edr-1`, which this hunt could not read (no read access, not found, or closed), so the hunt never searched there.'
    );
  });

  it('lists ten names at most and counts the rest', () => {
    const detail = describeUnsearched(
      Array.from({ length: 12 }, (_value, index) => `idx-${index}`)
    );

    expect(detail).toContain('`idx-9` and 2 more');
    expect(detail).not.toContain('idx-10');
  });

  it('lists fewer names when ten would pass the bound, and still counts the rest', () => {
    const names = Array.from({ length: 10 }, (_value, index) => `${'x'.repeat(90)}-${index}`);
    const detail = describeUnsearched(names);

    expect(detail.length).toBeLessThanOrEqual(MAX_UNSEARCHED_DETAIL_CHARS);
    expect(detail).toContain(`\`${names[2]}\` and 7 more`);
    expect(detail).not.toContain(names[3]);
  });

  it('shows a name longer than an index name can be cut to 255 characters, so one name always fits', () => {
    const name = 'y'.repeat(600);
    const detail = describeUnsearched([name, 'z-1']);

    expect(detail.length).toBeLessThanOrEqual(MAX_UNSEARCHED_DETAIL_CHARS);
    expect(detail).toContain(`\`${'y'.repeat(254)}…\` and \`z-1\``);
  });
});

describe('unsearchedGaps', () => {
  it.each([
    ['one dropped name', ['custom-edr-1']],
    ['two dropped names', ['custom-edr-1', 'custom-edr-2']],
  ])('is one final gap for %s', (_label, missing) => {
    expect(unsearchedGaps({ index_patterns: ['logs-*'], missing })).toEqual([
      { reason: 'index_not_searched', detail: describeUnsearched(missing) },
    ]);
  });

  it('is empty when the scope dropped nothing', () => {
    expect(
      unsearchedGaps({ index_patterns: ['logs-*', 'winlogbeat-*'], missing: ['winlogbeat-*'] })
    ).toEqual([]);
  });
});
