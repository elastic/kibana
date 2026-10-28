/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings, Tooltip } from '@elastic/charts';
import type { BrushEndListener } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { TimeSeriesPoint } from '../../../../common/types/applications';
import { useFormatters } from '../../../hooks/use_formatters';

const CHART_HEIGHT = 140;

const chartAreaCss = css({ blockSize: CHART_HEIGHT });

const fillCss = css({ blockSize: '100%' });

const TITLE = i18n.translate('xpack.digitalExperience.pageLoadsChart.title', {
  defaultMessage: 'Page loads',
});

const NO_DATA = i18n.translate('xpack.digitalExperience.pageLoadsChart.noData', {
  defaultMessage: 'No page loads in the selected time range',
});

/**
 * Page loads over the time range, where dragging over the bars selects a narrower range; the chart
 * area keeps its height while loading or empty.
 */
export function PageLoadsChart({
  points,
  isLoading,
  onTimeRangeSelect,
}: {
  points: TimeSeriesPoint[];
  isLoading: boolean;
  /** The range, in epoch milliseconds, dragged over the chart. */
  onTimeRangeSelect: (range: { start: number; end: number }) => void;
}) {
  const baseTheme = useElasticChartsTheme();
  const { formatDate, timeZone } = useFormatters();
  const hasPageLoads = points.some(({ count }) => count > 0);

  const onBrushEnd: BrushEndListener = (brushArea) => {
    const [start, end] = ('x' in brushArea && brushArea.x) || [];
    // A time axis gives epoch milliseconds.
    if (typeof start === 'number' && typeof end === 'number') {
      onTimeRangeSelect({ start, end });
    }
  };

  const renderChartArea = () => {
    if (isLoading || !hasPageLoads) {
      return (
        <EuiFlexGroup css={fillCss} alignItems="center" justifyContent="center">
          {isLoading ? (
            <EuiLoadingChart size="l" />
          ) : (
            <EuiText size="s" color="subdued">
              {NO_DATA}
            </EuiText>
          )}
        </EuiFlexGroup>
      );
    }
    return (
      <Chart size={{ height: CHART_HEIGHT }}>
        <Settings
          baseTheme={baseTheme}
          showLegend={false}
          locale={i18n.getLocale()}
          onBrushEnd={onBrushEnd}
        />
        <Tooltip headerFormatter={({ value }) => formatDate(value)} />
        <Axis id="time" position={Position.Bottom} />
        <Axis id="count" position={Position.Left} gridLine={{ visible: true }} ticks={4} />
        <BarSeries
          id="pageLoads"
          name={TITLE}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="timestamp"
          yAccessors={['count']}
          data={points}
          enableHistogramMode
          timeZone={timeZone}
        />
      </Chart>
    );
  };

  return (
    <EuiPanel hasBorder data-test-subj="digitalExperiencePageLoadsChart">
      <EuiTitle size="xs">
        <h2>{TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div css={chartAreaCss}>{renderChartArea()}</div>
    </EuiPanel>
  );
}
