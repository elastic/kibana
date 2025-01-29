/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  Fit,
  LineSeries,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import React from 'react';
import { EuiLoadingChart, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';

interface Data {
  key: number;
  value: number | undefined;
}
type ChartType = 'area' | 'line';
type State = 'success' | 'error';

export interface Props {
  id: string;
  data: Data[];
  chart: ChartType;
  state: State;
  size?: 'compact' | 'default';
  isLoading: boolean;
}

export function SloSparkline({ chart, data, id, isLoading, size, state }: Props) {
  const charts = useKibana().services.charts;
  const baseTheme = charts.theme.useChartsBaseTheme();
  const sparklineTheme = charts.theme.useSparklineOverrides();

  const { euiTheme } = useEuiTheme();

  const color = state === 'error' ? euiTheme.colors.danger : euiTheme.colors.success;
  const ChartComponent = chart === 'area' ? AreaSeries : LineSeries;

  if (isLoading) {
    return <EuiLoadingChart style={{ minWidth: 60, justifyContent: 'center' }} size="m" mono />;
  }

  const height = size === 'compact' ? 14 : 28;
  const width = size === 'compact' ? 40 : 60;

  return (
    <Chart size={{ height, width }}>
      <Settings
        baseTheme={baseTheme}
        showLegend={false}
        theme={sparklineTheme}
        locale={i18n.getLocale()}
      />
      <Tooltip type={TooltipType.None} />
      <Axis
        id="axis"
        hide
        domain={{
          min: NaN,
          max: NaN,
          fit: true,
        }}
        gridLine={{
          visible: false,
        }}
      />
      <ChartComponent
        color={color}
        data={data}
        fit={Fit.Nearest}
        id={id}
        lineSeriesStyle={{
          point: { visible: 'never' },
        }}
        xAccessor={'key'}
        xScaleType={ScaleType.Time}
        yAccessors={['value']}
        yScaleType={ScaleType.Linear}
      />
    </Chart>
  );
}
