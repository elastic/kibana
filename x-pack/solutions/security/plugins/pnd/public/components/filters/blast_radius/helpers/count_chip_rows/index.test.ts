/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countChipRows } from '.';

const defaultParams = { containerWidth: 100, gapPx: 6 };

describe('countChipRows', () => {
  it('returns no rows for no chips', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [] })).toEqual(0);
  });

  it('returns one row for a single chip', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [40] })).toEqual(1);
  });

  it('keeps two chips that fit on one row', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [40, 40] })).toEqual(1);
  });

  it('wraps a chip that does not fit', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [60, 60] })).toEqual(2);
  });

  /** The gap is real width: two 50px chips do not fit a 100px row once 6px separates them. */
  it('counts the gap between chips', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [50, 50] })).toEqual(2);
  });

  it('fills a row exactly to the container width', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [47, 47] })).toEqual(1);
  });

  /** Flex wrapping never splits a chip, so an over-wide one overflows its own row. */
  it('gives a chip wider than the container its own row', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [200] })).toEqual(1);
  });

  it('starts a new row after an over-wide chip', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [200, 40] })).toEqual(2);
  });

  it('counts three rows when nothing shares one', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [80, 80, 80] })).toEqual(3);
  });

  it('packs as many chips per row as fit', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [40, 40, 40, 40] })).toEqual(2);
  });

  it('ignores the gap before the first chip on a row', () => {
    expect(countChipRows({ ...defaultParams, chipWidths: [100, 100] })).toEqual(2);
  });
});
