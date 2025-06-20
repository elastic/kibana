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
  DEFAULT_XY_HIDDEN_LEGEND,
} from '../../../shared/charts/constants';

export const logs = {
  get: ({ schemas }: { schemas: Array<'ecs' | 'semconv'> }) => {
    const resolvedFormula = formulas.get({ schemas });

    const logRate: LensConfigWithId = {
      id: 'logRate',
      chartType: 'xy',
      title: resolvedFormula.logRate.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.logRate],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    return {
      xy: {
        logRate,
      },
    };
  },
};
