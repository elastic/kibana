/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clickBinRadius, clickMapStageFit } from './click_map_hit';

describe('clickMapStageFit', () => {
  it('letterboxes the page into the stage', () => {
    expect(clickMapStageFit(640, 400, 1280, 800)).toEqual({ scale: 0.5, left: 0, top: 0 });
    expect(clickMapStageFit(1400, 420, 1280, 800).scale).toBe(0.525);
  });

  it('falls back when the stage has no size yet', () => {
    expect(clickMapStageFit(0, 420, 1280, 800)).toEqual({ scale: 1, left: 0, top: 0 });
  });
});

describe('clickBinRadius', () => {
  it('grows from 28 to 44 with relative count', () => {
    expect(clickBinRadius(0, 10)).toBe(28);
    expect(clickBinRadius(10, 10)).toBe(44);
  });
});
