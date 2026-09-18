/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { SPARKLINE_HEIGHT_SIZE, TrendSparkline, type SparklinePoint } from './trend_sparkline';
import { CHART_ARIA_LABEL, CHART_SERIES_NAME, HOURS_AGO, NOW } from './translations';
import type { TrendChartPanelColor } from './constants';

interface ProposalsTrendChartCardProps {
  id: string;
  label: string;
  color: TrendChartPanelColor;
  count: number;
  /** Oldest-first. */
  series: SparklinePoint[];
  isLoading: boolean;
  /** The window the series was fetched for; labels and tooltips read from it. */
  windowHours: number;
  bucketMinutes: number;
}

export const ProposalsTrendChartCard: React.FC<ProposalsTrendChartCardProps> = ({
  id,
  label,
  color,
  count,
  series,
  isLoading,
  windowHours,
  bucketMinutes,
}) => {
  const { euiTheme } = useEuiTheme();

  // @elastic/charts needs a real colour value, not an EUI token name, and the
  // `vis` palette rather than the status colours: visualization colours are
  // curated for charts and stay correct as the palette evolves.
  const colorMap: Record<TrendChartPanelColor, string> = {
    danger: euiTheme.colors.vis.euiColorVisDanger0,
    warning: euiTheme.colors.vis.euiColorVisWarning0,
    primary: euiTheme.colors.vis.euiColorVisBase0,
  };
  const resolvedColor = colorMap[color];
  const sparklineHeight = euiTheme.size[SPARKLINE_HEIGHT_SIZE];

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      css={{ borderRadius: euiTheme.size.s }}
      data-test-subj={`alertZeroProposalsTrendChartCard-${id}`}
    >
      <EuiTitle size="xxs">
        <h3 css={{ fontWeight: euiTheme.font.weight.semiBold }}>{label}</h3>
      </EuiTitle>
      {isLoading ? (
        <EuiSkeletonTitle
          size="l"
          data-test-subj={`alertZeroProposalsTrendChartCountLoading-${id}`}
        />
      ) : (
        <EuiTitle size="l">
          <p data-test-subj={`alertZeroProposalsTrendChartCount-${id}`}>{count}</p>
        </EuiTitle>
      )}
      <EuiSpacer size="s" />
      {isLoading ? (
        <EuiSkeletonRectangle
          width="100%"
          height={sparklineHeight}
          borderRadius="m"
          data-test-subj={`alertZeroProposalsTrendChartLoading-${id}`}
        />
      ) : (
        <TrendSparkline
          series={series}
          color={resolvedColor}
          ariaLabel={CHART_ARIA_LABEL(label, count, windowHours)}
          panelId={id}
          seriesName={CHART_SERIES_NAME(label)}
          bucketMinutes={bucketMinutes}
        />
      )}
      <EuiSpacer size="xs" />
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {HOURS_AGO(windowHours)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {NOW}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
