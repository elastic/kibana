/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CSSProperties } from 'react';
import React, { useEffect, useRef } from 'react';
import { Chart, Metric, Settings, type MetricWNumber, type MetricWTrend } from '@elastic/charts';
import { EuiPanel, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ChartLoadingProgress,
  ChartPlaceholder,
} from '../../../../../components/lens/chart_placeholder';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';

export interface Props extends Pick<MetricWTrend, 'title' | 'color' | 'extra' | 'subtitle'> {
  id: string;
  loading: boolean;
  // `null` is "no data": Elastic Charts renders it as the Metric theme's
  // `nonFiniteText` ("N/A") rather than a fabricated value.
  value: number | null;
  toolTip: React.ReactNode;
  style?: CSSProperties;
  valueFormatter?: (value: number) => string;
}

const DEFAULT_FORMATTER = (d: number) => d.toString();

export const MetricChartWrapper = React.memo(
  ({
    color,
    extra,
    id,
    loading,
    value,
    subtitle,
    title,
    toolTip,
    style,
    valueFormatter,
    ...props
  }: Props) => {
    const { euiTheme } = useEuiTheme();
    const loadedOnce = useRef(false);

    const {
      services: { charts },
    } = useKibanaContextForPlugin();

    const baseTheme = charts.theme.useChartsBaseTheme();

    useEffect(() => {
      if (!loadedOnce.current && !loading) {
        loadedOnce.current = true;
      }
    }, [loading]);

    // `Metric` only renders numbers: swap `null` → `NaN` so an empty tile shows
    // the theme's `nonFiniteText` ("N/A") instead of a fabricated value.
    const numericValue = value ?? Number.NaN;
    const format = valueFormatter ?? DEFAULT_FORMATTER;

    const metricsData: MetricWNumber = {
      title,
      subtitle,
      color,
      extra,
      value: numericValue,
      valueFormatter: format,
    };

    return (
      <EuiPanel
        {...props}
        hasShadow={false}
        paddingSize="none"
        data-test-subj={id}
        css={css`
          display: flex;
          position: relative;
        `}
      >
        {loading && !loadedOnce.current ? (
          <ChartPlaceholder style={style} />
        ) : (
          <EuiToolTip className="eui-fullWidth" content={toolTip} anchorClassName="eui-fullWidth">
            <Chart
              size={style}
              css={css`
                .echMetric {
                  border-radius: ${euiTheme.border.radius.medium};
                  pointer-events: none;
                }
              `}
            >
              {loading && <ChartLoadingProgress hasTopMargin={false} />}
              <Settings baseTheme={baseTheme} />
              <Metric id={id} data={[[metricsData]]} />
            </Chart>
          </EuiToolTip>
        )}
      </EuiPanel>
    );
  }
);
