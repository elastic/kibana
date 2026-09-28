/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonTitle,
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
  /** Peak shared across the row so the three sparklines sit on one scale. */
  yMax: number;
}

/**
 * One trend tile: quiet label, the current count, a sparkline over the window, and the
 * window bounds as a footer. Label and figure stay small so the row reads as a summary
 * strip above the queue rather than a dashboard of KPIs.
 */
export const ProposalsTrendChartCard: React.FC<ProposalsTrendChartCardProps> = ({
  id,
  label,
  color,
  count,
  series,
  isLoading,
  windowHours,
  bucketMinutes,
  yMax,
}) => {
  const { euiTheme } = useEuiTheme();
  // @elastic/charts needs a real colour value, not an EUI token name, and the
  // `vis` palette rather than the status colours: visualization colours are
  // curated for charts and stay correct as the palette evolves.
  const colorMap: Record<TrendChartPanelColor, string> = {
    danger: euiTheme.colors.vis.euiColorVisDanger0,
    warning: euiTheme.colors.vis.euiColorVisWarning0,
    // euiColorVis2 = #61A2FF (blue). euiColorVisBase0 is not blue; euiColorVis0 is teal (#16C5C0).
    primary: euiTheme.colors.vis.euiColorVis2,
  };
  const resolvedColor = colorMap[color];
  const sparklineHeight = euiTheme.size[SPARKLINE_HEIGHT_SIZE];

  const cardStyles = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    height: 100%;
    min-width: 0;
    border-radius: ${euiTheme.border.radius.medium};
  `;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      css={cardStyles}
      data-test-subj={`alertZeroProposalsTrendChartCard-${id}`}
    >
      <EuiTitle size="xxxs" css={{ color: euiTheme.colors.textSubdued }}>
        <h3>{label}</h3>
      </EuiTitle>
      {isLoading ? (
        <EuiSkeletonTitle
          size="s"
          data-test-subj={`alertZeroProposalsTrendChartCountLoading-${id}`}
        />
      ) : (
        <EuiTitle size="s">
          <p data-test-subj={`alertZeroProposalsTrendChartCount-${id}`}>{count}</p>
        </EuiTitle>
      )}
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
          yMax={yMax}
        />
      )}
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="none"
        responsive={false}
      >
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
