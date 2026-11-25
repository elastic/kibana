/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mulberry32 } from './seeded_random';

// The first 5 numbers of the original generator (written with the operators `^`, `|` and `>>>`) for 5 seeds, and the sum of
// its first 200,000 numbers for seed 7. They were computed once with the original code, so a change that alters a number
// breaks the generated data (the seeds 1 to 3 are the baseline of the week) and fails here.
const REFERENCE: Record<string, number[]> = {
  '0': [
    0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111,
    0.46732782293111086,
  ],
  '1': [
    0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741,
    0.9683778982143849,
  ],
  '123456789': [
    0.2577907438389957, 0.9707721115555614, 0.7853280142880976, 0.20616457983851433,
    0.30307188746519387,
  ],
  '2654435761': [
    0.5464560757391155, 0.45955629041418433, 0.2470416973810643, 0.5192999374121428,
    0.8892884191591293,
  ],
  '4294967295': [
    0.8964226141106337, 0.189478256739676, 0.7156526781618595, 0.9440599093213677,
    0.8452364315744489,
  ],
};
const SUM_OF_200000_FOR_SEED_7 = 99850.632832;

describe('mulberry32', () => {
  it.each(Object.keys(REFERENCE))(
    'gives the numbers of the original generator for seed %s',
    (seed) => {
      const random = mulberry32(Number(seed));

      expect(Array.from({ length: 5 }, () => random())).toEqual(REFERENCE[seed]);
    }
  );

  it('keeps giving the numbers of the original generator over a long run', () => {
    const random = mulberry32(7);
    let sum = 0;
    for (let i = 0; i < 200000; i++) sum += random();

    expect(sum).toBeCloseTo(SUM_OF_200000_FOR_SEED_7, 5);
  });

  it('gives the same numbers for the same seed and other numbers for another seed', () => {
    const first = mulberry32(42);
    const second = mulberry32(42);
    const other = mulberry32(43);

    expect([first(), first()]).toEqual([second(), second()]);
    expect(first()).not.toEqual(other());
  });

  it('stays in [0, 1)', () => {
    const random = mulberry32(2654435761);
    for (let i = 0; i < 10000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
