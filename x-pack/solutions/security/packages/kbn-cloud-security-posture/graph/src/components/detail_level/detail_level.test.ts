/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDetailLevel, DETAIL_LEVEL_ZOOM_THRESHOLD } from './detail_level';

describe('getDetailLevel', () => {
  it('returns simplified below the threshold', () => {
    expect(getDetailLevel(DETAIL_LEVEL_ZOOM_THRESHOLD - 0.1)).toBe('simplified');
  });

  it('returns detailed at or above the threshold', () => {
    expect(getDetailLevel(DETAIL_LEVEL_ZOOM_THRESHOLD)).toBe('detailed');
    expect(getDetailLevel(DETAIL_LEVEL_ZOOM_THRESHOLD + 0.5)).toBe('detailed');
  });
});
