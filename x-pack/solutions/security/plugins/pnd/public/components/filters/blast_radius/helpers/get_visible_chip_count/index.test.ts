/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getVisibleChipCount } from '.';

/**
 * A 100px row, 6px gaps, 40px chips and a 30px `+N` chip: three 40px chips fit beside the `+N`
 * chip in two rows, a fourth does not.
 */
const defaultParams = {
  activeIndex: -1,
  containerWidth: 100,
  gapPx: 6,
  maxRows: 2,
  overflowChipWidth: 30,
};

const chipWidths = (count: number): number[] => new Array(count).fill(40);

describe('getVisibleChipCount', () => {
  it('returns no chips for no chips', () => {
    expect(getVisibleChipCount({ ...defaultParams, chipWidths: [] })).toEqual(0);
  });

  /** `0` means "not laid out yet", and a guess would hide chips that do fit. */
  it('returns every chip before the row has been laid out', () => {
    expect(
      getVisibleChipCount({ ...defaultParams, chipWidths: chipWidths(9), containerWidth: 0 })
    ).toEqual(9);
  });

  it('returns every chip when they all fit within the row limit', () => {
    expect(getVisibleChipCount({ ...defaultParams, chipWidths: chipWidths(4) })).toEqual(4);
  });

  it('collapses to the chips that fit', () => {
    expect(getVisibleChipCount({ ...defaultParams, chipWidths: chipWidths(6) })).toEqual(3);
  });

  /**
   * The `+N` chip needs room of its own: four 40px chips fill both rows exactly, so the fourth has
   * to give way to the chip that says three more exist.
   */
  it('reserves room for the overflow chip', () => {
    expect(getVisibleChipCount({ ...defaultParams, chipWidths: chipWidths(5) })).toEqual(3);
  });

  it('does not reserve room for an overflow chip that will not be drawn', () => {
    expect(
      getVisibleChipCount({ ...defaultParams, chipWidths: chipWidths(4), overflowChipWidth: 90 })
    ).toEqual(4);
  });

  /**
   * A filter the analyst cannot see is a filter they cannot clear, so the active chip is visible
   * even when the row has to grow past its limit to show it.
   */
  it('keeps the active chip visible when it would be collapsed away', () => {
    expect(
      getVisibleChipCount({ ...defaultParams, activeIndex: 4, chipWidths: chipWidths(6) })
    ).toEqual(5);
  });

  it('leaves the count alone when the active chip already fits', () => {
    expect(
      getVisibleChipCount({ ...defaultParams, activeIndex: 1, chipWidths: chipWidths(6) })
    ).toEqual(3);
  });

  it('ignores an absent active chip', () => {
    expect(
      getVisibleChipCount({ ...defaultParams, activeIndex: -1, chipWidths: chipWidths(6) })
    ).toEqual(3);
  });

  it('shows more chips when more rows are allowed', () => {
    expect(
      getVisibleChipCount({ ...defaultParams, chipWidths: chipWidths(8), maxRows: 3 })
    ).toEqual(5);
  });

  /** Flex wrapping never splits a chip, so an over-wide one claims a whole row for itself. */
  it('gives up a row to a chip wider than the container', () => {
    expect(getVisibleChipCount({ ...defaultParams, chipWidths: [200, 40, 40, 40, 40] })).toEqual(2);
  });
});
