/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegendValue } from '@elastic/charts';
import type { XYLegendValue } from '@kbn/chart-expressions-common';
import type { LensXYConfigBase } from '@kbn/lens-embeddable-utils';

// Metric labels are defined in a Lens-free module so consumers (e.g. the
// Hosts KPI tiles) can import them via the package's `common` entry without
// pulling the Lens/charts dependencies this file carries.
export * from './labels';

export const DEFAULT_XY_FITTING_FUNCTION: Pick<LensXYConfigBase, 'fittingFunction'> = {
  fittingFunction: 'Linear',
};

export const DEFAULT_XY_HIDDEN_LEGEND: Pick<LensXYConfigBase, 'legend'> = {
  legend: {
    show: false,
  },
};

export const DEFAULT_XY_LEGEND: Pick<LensXYConfigBase, 'legend'> = {
  legend: {
    position: 'bottom',
    show: true,
  },
};
export const DEFAULT_LEGEND_STATS: XYLegendValue[] = [
  LegendValue.Average,
  LegendValue.Min,
  LegendValue.Max,
  LegendValue.LastNonNullValue,
];

export const DEFAULT_XY_YBOUNDS: Pick<LensXYConfigBase, 'yBounds'> = {
  yBounds: {
    mode: 'custom',
    lowerBound: 0,
    upperBound: 1,
  },
};

export const DEFAULT_XY_HIDDEN_AXIS_TITLE: Pick<LensXYConfigBase, 'axisTitleVisibility'> = {
  axisTitleVisibility: {
    showXAxisTitle: false,
    showYAxisTitle: false,
  },
};
