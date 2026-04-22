/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Chart, LayoutDirection, LIGHT_THEME, Metric, Settings } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export interface StreamMetricConfig {
  subtitle: string;
  value: number;
  domainMax: number;
  extra?: { value: string };
}

export interface StreamsMetricTilesProps {
  metrics?: StreamMetricConfig[];
  height?: number;
}

const DEFAULT_METRICS: StreamMetricConfig[] = [
  {
    subtitle: 'logs.ngnix.error',
    value: 128400,
    domainMax: 200000,
    extra: { value: '+22%' },
  },
  {
    subtitle: 'logs.ngnix.access',
    value: 48200,
    domainMax: 80000,
    extra: { value: '+14%' },
  },
];

export function StreamsMetricTiles({
  metrics = DEFAULT_METRICS,
  height = 160,
}: StreamsMetricTilesProps) {
  const { euiTheme } = useEuiTheme();

  const data = useMemo(
    () => [
      metrics.map((metric) => ({
        subtitle: metric.subtitle,
        value: metric.value,
        valueFormatter: (n: number) => n.toLocaleString(),
        domainMax: metric.domainMax,
        progressBarDirection: LayoutDirection.Vertical,
        background: euiTheme.colors.backgroundBaseSubdued,
        color: euiTheme.colors.accent,
        extra: metric.extra,
      })),
    ],
    [euiTheme.colors.accent, euiTheme.colors.backgroundBaseSubdued, metrics]
  );

  const chartContainerCss = css`
    height: ${height}px;
    width: 100%;

    .echMetricText__value {
      font-family: ${euiTheme.font.familyCode};
    }
  `;

  return (
    <div
      className="sigeventsOverviewStreamsMetricTiles"
      css={chartContainerCss}
      data-test-subj="sigeventsOverviewStreamsMetricTiles"
    >
      <Chart>
        <Settings
          baseTheme={LIGHT_THEME}
          locale={i18n.getLocale()}
          theme={{
            metric: {
              minValueFontSize: 10,
              barBackground: euiTheme.colors.backgroundBaseDisabled,
              border: euiTheme.colors.borderBaseSubdued,
            },
          }}
        />
        <Metric id="sigevents-streams-metrics" data={data} />
      </Chart>
    </div>
  );
}
