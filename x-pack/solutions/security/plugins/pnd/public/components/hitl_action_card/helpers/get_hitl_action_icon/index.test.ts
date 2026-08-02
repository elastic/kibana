/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecommendedAction } from '@kbn/pnd-common';

import { getHitlActionIcon } from '.';

describe('getHitlActionIcon', () => {
  const expected: Array<[RecommendedAction, string]> = [
    ['contain', 'lock'],
    ['escalate', 'flag'],
    ['investigate', 'inspect'],
    ['tune', 'wrench'],
  ];

  it.each(expected)('returns the %s glyph', (recommendedAction, iconType) => {
    expect(getHitlActionIcon(recommendedAction)).toEqual(iconType);
  });
});
