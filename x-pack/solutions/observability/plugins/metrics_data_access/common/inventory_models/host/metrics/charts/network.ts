/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfigWithId } from '../../../types';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_LEGEND,
  DEFAULT_LEGEND_STATS,
  NETWORK_LABEL,
  RX_LABEL,
  TX_LABEL,
} from '../../../shared/charts/constants';
import type { FormulasCatalog } from '../../../shared/metrics/types';
import type { HostFormulas } from '../formulas';

export const init = (formulas: FormulasCatalog<HostFormulas>) => {
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
            ...formulas.get('rx'),
            label: RX_LABEL,
          },
          {
            ...formulas.get('tx'),
            label: TX_LABEL,
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

  const rx: LensConfigWithId = {
    id: 'rx',
    chartType: 'xy',
    title: formulas.get('rx').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('rx')],
      },
    ],
    ...DEFAULT_XY_FITTING_FUNCTION,
    legend: {
      ...DEFAULT_XY_LEGEND.legend,
      legendStats: DEFAULT_LEGEND_STATS,
    },
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  const tx: LensConfigWithId = {
    id: 'tx',
    chartType: 'xy',
    title: formulas.get('tx').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('tx')],
      },
    ],
    ...DEFAULT_XY_FITTING_FUNCTION,
    legend: {
      ...DEFAULT_XY_LEGEND.legend,
      legendStats: DEFAULT_LEGEND_STATS,
    },
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  return {
    xy: {
      rxTx,
      rx,
      tx,
    },
  } as const;
};
