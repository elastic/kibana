/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { ChartSeriesData } from '../../../common/components/charts/common';
import { useThemes } from '../../../common/components/charts/common';
import { AreaChartBaseComponent } from '../../../common/components/charts/areachart';
const customHeight = '120px';
const customWidth = '95%';

export const CostSavingsTrend = () => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const mockAreaChartData: ChartSeriesData[] = [
    {
      key: 'uniqueSourceIpsHistogram',
      value: [
        { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 580213 },
        { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1096175 },
        { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12382 },
      ],
      color: colors.accentSecondary,
    },
    {
      key: 'uniqueDestinationIpsHistogram',
      value: [
        { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 5975 },
        { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 84366 },
        { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 2280 },
      ],
      color: colors.danger,
    },
  ];

  const themes = useThemes();
  const configs = {
    settings: {
      ...themes,
      baseTheme: {
        ...themes.baseTheme,
        background: {
          color: `${colors.backgroundBaseSubdued}00`,
          fallbackColor: colors.backgroundBaseSubdued,
        },
      },
    },
  };
  return (
    <AreaChartBaseComponent
      height={customHeight}
      width={customWidth}
      data={mockAreaChartData}
      configs={configs}
    />
  );
};
