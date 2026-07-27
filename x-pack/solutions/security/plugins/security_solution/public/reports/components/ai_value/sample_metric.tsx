/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Chart, Metric, Settings, type MetricDatum } from '@elastic/charts';
import { EuiIcon, useEuiTheme, type IconType } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';

interface SampleMetricProps {
  id: string;
  title: string;
  value: number;
  valueFormatter: (value: number) => string;
  icon: IconType;
  color?: string;
}

const SampleMetricComponent: React.FC<SampleMetricProps> = ({
  id,
  title,
  value,
  valueFormatter,
  icon,
  color,
}) => {
  const chartBaseTheme = useElasticChartsTheme();
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const data = useMemo<MetricDatum>(
    () => ({
      title,
      value,
      valueFormatter,
      color: color ?? colors.backgroundBasePlain,
      icon: ({ width, height, color: iconColor }) => (
        <EuiIcon type={icon} width={width} height={height} fill={iconColor} aria-hidden={true} />
      ),
    }),
    [title, value, valueFormatter, color, colors.backgroundBasePlain, icon]
  );

  return (
    <Chart>
      <Settings
        baseTheme={chartBaseTheme}
        locale={i18n.getLocale()}
        theme={{ metric: { valueTextAlign: 'left' } }}
      />
      <Metric id={id} data={[[data]]} />
    </Chart>
  );
};

export const SampleMetric = React.memo(SampleMetricComponent);
