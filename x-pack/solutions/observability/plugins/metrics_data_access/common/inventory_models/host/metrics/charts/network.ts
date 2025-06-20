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
  DEFAULT_XY_LEGEND,
  NETWORK_LABEL,
  RX_LABEL,
  TX_LABEL,
} from '../../../shared/charts/constants';

export const network = {
  get: ({ schemas }: { schemas: Array<'ecs' | 'semconv'> }) => {
    const resolvedFormula = formulas.get({ schemas });

    const rxTx: LensConfigWithId = {
      id: 'rxTx',
      chartType: 'xy',
      title: NETWORK_LABEL,
      layers: [
        {
          seriesType: 'area',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [
            {
              ...resolvedFormula.rx,
              label: RX_LABEL,
            },
            {
              ...resolvedFormula.tx,
              label: TX_LABEL,
            },
          ],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const rx: LensConfigWithId = {
      id: 'rx',
      chartType: 'xy',
      title: resolvedFormula.rx.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.rx],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const tx: LensConfigWithId = {
      id: 'tx',
      chartType: 'xy',
      title: resolvedFormula.tx.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.tx],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    return {
      xy: {
        rxTx,
        rx,
        tx,
      },
    };
  },
};
