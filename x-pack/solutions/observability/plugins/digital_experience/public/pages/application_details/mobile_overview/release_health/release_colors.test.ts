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
});
