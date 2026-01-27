/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_LEGEND,
  DEFAULT_LEGEND_STATS,
} from '../../../shared/charts/constants';

const logRate: LensConfigWithId = {
  id: 'logRate',
  chartType: 'xy',
  title: formulas.logRate.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.logRate],
    },
    {
      type: 'reference',
      yAxis: [
        {
          value: '1',
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  legend: {
    ...DEFAULT_XY_LEGEND.legend,
    legendStats: DEFAULT_LEGEND_STATS,
  },
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

export const logs = {
  xy: {
    logRate,
  },
};
