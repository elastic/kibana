/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialTheme } from '@elastic/charts';

/** The prototype's translucent area fill, so the 100% stroke stays the accent. */
const AREA_FILL_OPACITY = 0.2;
const LINE_STROKE_WIDTH_PX = 2;
const NO_SPACING = { bottom: 0, left: 0, right: 0, top: 0 } as const;

/**
 * The overrides a 40px sparkline needs on top of `useElasticChartsTheme()`.
 *
 * Everything a full chart spends height on is off: its own background (the card already painted
 * one), every margin and padding (40px of card is 40px of chart), the gridlines, and the point
 * markers — 24 dots across that width is a dotted line, not a trend. What is left is a stroke and a
 * translucent fill.
 *
 * A function rather than a frozen constant so the caller can spread it into a theme array without
 * `@elastic/charts` ever holding a reference the caller could mutate.
 */
export const getSparklineTheme = (): PartialTheme => ({
  areaSeriesStyle: {
    area: { opacity: AREA_FILL_OPACITY },
    line: { strokeWidth: LINE_STROKE_WIDTH_PX, visible: true },
    point: { visible: 'never' },
  },
  axes: {
    gridLine: {
      horizontal: { visible: false },
      vertical: { visible: false },
    },
  },
  background: { color: 'transparent' },
  chartMargins: NO_SPACING,
  chartPaddings: NO_SPACING,
});
