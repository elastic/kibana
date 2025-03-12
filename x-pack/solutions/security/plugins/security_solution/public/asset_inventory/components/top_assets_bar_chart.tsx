/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiProgress, EuiFlexGroup, EuiLoadingChart } from '@elastic/eui';
import { Chart, Settings, Axis, BarSeries, Position, ScaleType } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import type { AggregationResult } from '../hooks/use_fetch_chart_data';

const chartTitle = i18n.translate(
  'xpack.securitySolution.assetInventory.topAssetsBarChart.chartTitle',
  {
    defaultMessage: 'Top 10 Asset Types',
  }
);

const yAxisTitle = i18n.translate(
  'xpack.securitySolution.assetInventory.topAssetsBarChart.yAxisTitle',
  {
    defaultMessage: 'Count of Assets',
  }
);

const chartStyles = { height: '260px' };

export interface TopAssetsBarChartProps {
  isLoading: boolean;
  isFetching: boolean;
  entities: AggregationResult[];
}

export const TopAssetsBarChart = ({ isLoading, isFetching, entities }: TopAssetsBarChartProps) => {
  const baseTheme = useElasticChartsTheme();
  return (
    <div css={chartStyles}>
      <EuiProgress size="xs" color="accent" style={{ opacity: isFetching ? 1 : 0 }} />
      {isLoading ? (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          css={{ height: '100%', width: '100%' }}
        >
          <EuiLoadingChart size="xl" />
        </EuiFlexGroup>
      ) : (
        <Chart title={chartTitle}>
          <Settings baseTheme={baseTheme} showLegend={true} animateData={true} />
          <Axis
            id="X-axis"
            position={Position.Bottom}
            gridLine={{
              visible: false,
            }}
          />
          <Axis
            id="Y-axis"
            position={Position.Left}
            title={yAxisTitle}
            maximumFractionDigits={0}
            showOverlappingTicks={false}
            gridLine={{
              visible: false,
            }}
          />
          <BarSeries
            id="grouped-categories"
            xScaleType={ScaleType.Ordinal}
            yScaleType={ScaleType.Linear}
            xAccessor="category"
            yAccessors={['count']}
            yNice={true}
            splitSeriesAccessors={['source']}
            stackAccessors={['category']}
            minBarHeight={1}
            data={entities}
          />
        </Chart>
      )}
    </div>
  );
};
