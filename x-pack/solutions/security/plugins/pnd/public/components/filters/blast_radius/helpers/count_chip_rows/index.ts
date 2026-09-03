/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CountChipRowsParams {
  /** Rendered chip widths in visual order, including the `+N` chip when one is drawn. */
  chipWidths: readonly number[];
  /** Width of the row the chips wrap inside. */
  containerWidth: number;
  /** Space between two chips on the same row. */
  gapPx: number;
}

/** One row of chips being packed: how many rows so far, and how much of the last one is used. */
interface ChipRows {
  rows: number;
  used: number;
}

/**
 * How many rows `flex-wrap` will lay these chips out on.
 *
 * The prototype answers this by toggling `display` on a hidden duplicate row and counting distinct
 * `offsetTop` values (`BlastRadiusChips.tsx:45-59`), which makes the layout engine the only place the
 * rule lives and puts it out of reach of a test. The rule itself is simple enough to state directly:
 * a chip joins the current row when it and its gap still fit, and starts a new one when it does not.
 *
 * A chip wider than the container gets a row of its own rather than being split, which is what
 * `flex-wrap` does with an over-wide item — a long hostname must not silently cost two rows.
 */
export const countChipRows = ({
  chipWidths,
  containerWidth,
  gapPx,
}: CountChipRowsParams): number => {
  const { rows } = chipWidths.reduce<ChipRows>(
    ({ rows: rowsSoFar, used }, chipWidth) => {
      if (rowsSoFar === 0) {
        return { rows: 1, used: chipWidth };
      }

      const usedWithChip = used + gapPx + chipWidth;

      return usedWithChip <= containerWidth
        ? { rows: rowsSoFar, used: usedWithChip }
        : { rows: rowsSoFar + 1, used: chipWidth };
    },
    { rows: 0, used: 0 }
  );

  return rows;
};
