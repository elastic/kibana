/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MobileReleaseRow } from '../../../../../common/types/mobile';
import { getReleaseColors } from './release_colors';
import { TEST_VIS_COLORS } from './release_colors.test_helpers';

const row = (release: string, isOther = false): MobileReleaseRow => ({
  release,
  isOther,
  sessions: 1,
  users: 1,
  errorRate: null,
  coldStart: null,
  coldStarts: 0,
});

describe('getReleaseColors', () => {
  it('gives the releases the theme colours in order, and "Other" grey', () => {
    const colors = getReleaseColors([row('2.0.0'), row('1.0.0'), row('', true)], TEST_VIS_COLORS);

    expect([...colors]).toEqual([
      ['2.0.0', 'euiColorVis0'],
      ['1.0.0', 'euiColorVis1'],
      ['', 'euiColorVisGrey2'],
    ]);
  });

  it('keeps a release its colour when the page is filtered to it, by its rank among all of them', () => {
    const colors = getReleaseColors([row('1.0.0')], TEST_VIS_COLORS, ['2.0.0', '1.0.0']);

    expect(colors.get('1.0.0')).toBe('euiColorVis1');
  });

  it('gives a release the ranking misses a colour no ranked release has', () => {
    // The releases of a new OS before the ranking catches up
    const colors = getReleaseColors([row('B'), row('C')], TEST_VIS_COLORS, ['A', 'B']);

    expect(colors.get('B')).toBe('euiColorVis1');
    expect(colors.get('C')).toBe('euiColorVis0');
  });
});
