/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_LEGEND,
  NETWORK_LABEL,
  RX_LABEL,
  TX_LABEL,
} from '../../../shared/charts/constants';
import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';

const dockerContainerRxTx: LensConfigWithId = {
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
          ...formulas.dockerContainerNetworkRx,
          label: RX_LABEL,
        },
        {
          ...formulas.dockerContainerNetworkTx,
          label: TX_LABEL,
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

export const network = {
  xy: { dockerContainerRxTx },
};
