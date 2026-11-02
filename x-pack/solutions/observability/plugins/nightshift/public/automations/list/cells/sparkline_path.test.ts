/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPARKLINE_HEIGHT, SPARKLINE_WIDTH, toSparklinePath } from './sparkline_path';

describe('toSparklinePath', () => {
  it('starts at the bottom left and ends at the right edge', () => {
    const path = toSparklinePath([0, 2, 1], 2);

    expect(path.startsWith(`M0,${SPARKLINE_HEIGHT - 1}`)).toBe(true);
    expect(
      path.endsWith(`${SPARKLINE_WIDTH},${SPARKLINE_HEIGHT - 1 - (SPARKLINE_HEIGHT - 2) / 2}`)
    ).toBe(true);
    expect(path.match(/C/g)).toHaveLength(2);
  });
});
