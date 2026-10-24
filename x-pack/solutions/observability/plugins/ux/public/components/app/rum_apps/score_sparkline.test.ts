/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  scoreSparklineAreaPath,
  scoreSparklineLinePath,
  scoreSparklinePoints,
} from './score_sparkline_path';

describe('scoreSparklinePoints', () => {
  it('maps 0 and 100 onto a fixed vertical domain', () => {
    const points = scoreSparklinePoints([0, 100], 100, 20, 0);
    expect(points).toEqual([
      { x: 0, y: 20 },
      { x: 100, y: 0 },
    ]);
  });

  it('places a single score in the horizontal center', () => {
    expect(scoreSparklinePoints([50], 80, 20, 0)).toEqual([{ x: 40, y: 10 }]);
  });
});

describe('scoreSparkline paths', () => {
  it('builds a line and a closed area', () => {
    const points = scoreSparklinePoints([0, 100], 10, 10, 0);
    expect(scoreSparklineLinePath(points)).toBe('M0.00 10.00 L10.00 0.00');
    expect(scoreSparklineAreaPath(points, 10)).toBe('M0.00 10.00 L10.00 0.00 L10.00 10 L0.00 10 Z');
  });
});
