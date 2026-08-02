/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countChipRows } from '../count_chip_rows';

export interface GetVisibleChipCountParams {
  /** Index of the chip currently filtering the queue, or `-1` when none is. */
  activeIndex: number;
  /** Rendered width of every chip, in order, whether it is currently drawn or not. */
  chipWidths: readonly number[];
  /** `0` until the row has been laid out. */
  containerWidth: number;
  gapPx: number;
  maxRows: number;
  /** Rendered width of the `+N` chip, which needs room of its own once it is drawn. */
  overflowChipWidth: number;
}

/**
 * How many chips to draw before handing the rest to a `+N` chip.
 *
 * The largest number that still fits inside `maxRows`, measured **with** the `+N` chip that showing
 * fewer than all of them requires: reserving that room is the difference between a tidy two-row
 * summary and a row that overflows by exactly one chip.
 *
 * Before the row has been measured (`containerWidth` of `0`) every chip is drawn. A collapsed row is
 * a claim that the rest do not fit, and an unmeasured row has no grounds to make it.
 *
 * **The active chip is always drawn, even when the row has to grow to show it.** The prototype
 * instead searches *upward* for a larger count that fits and gives up if none does
 * (`BlastRadiusChips.tsx:90-105`), which cannot succeed here: fitting is monotonic in the chip count
 * once the `+N` chip has a fixed width, so no count above the collapsed one ever fits. A filter the
 * analyst cannot see is a filter they cannot clear, so the row grows instead of hiding it.
 */
export const getVisibleChipCount = ({
  activeIndex,
  chipWidths,
  containerWidth,
  gapPx,
  maxRows,
  overflowChipWidth,
}: GetVisibleChipCountParams): number => {
  const total = chipWidths.length;

  if (total === 0) {
    return 0;
  }

  if (containerWidth <= 0) {
    return total;
  }

  const fits = (candidate: number): boolean =>
    countChipRows({
      chipWidths:
        candidate < total
          ? [...chipWidths.slice(0, candidate), overflowChipWidth]
          : chipWidths.slice(0, candidate),
      containerWidth,
      gapPx,
    }) <= maxRows;

  // Widest first, so the answer is the most chips that fit rather than the fewest.
  const candidates = new Array(total + 1).fill(null).map((_, index) => total - index);
  const collapsed = candidates.find(fits) ?? total;

  return Math.max(collapsed, activeIndex + 1);
};
