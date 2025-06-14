/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiProgress,
  EuiFlexGroup,
  EuiLoadingChart,
  useEuiTheme,
  useEuiFontSize,
  type EuiThemeComputed,
  type EuiThemeFontSize,
} from '@elastic/eui';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { Axis, BarSeries, Chart, Position, Settings, ScaleType } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { AssetInventoryChartData } from '../hooks/use_fetch_chart_data/types';
import { ASSET_FIELDS } from '../constants';

const chartTitle = i18n.translate(
  'xpack.securitySolution.assetInventory.topAssetsBarChart.chartTitle',
  {
    defaultMessage: 'Top 10 Asset types',
  }
);

const yAxisTitle = i18n.translate(
  'xpack.securitySolution.assetInventory.topAssetsBarChart.yAxisTitle',
  {
    defaultMessage: 'Count of Assets',
  }
);

const getChartStyles = (euiTheme: EuiThemeComputed, xsFontSize: EuiThemeFontSize) => {
  return css({
    height: '260px',
    border: euiTheme.border.thin,
    borderRadius: euiTheme.border.radius.medium,
    padding: euiTheme.size.l,
    '.echLegendItem__label': {
      fontSize: xsFontSize.fontSize,
    },
    '.echLegendItem__action': {
      fontSize: xsFontSize.fontSize,
    },
  });
};

const getProgressStyle = (isFetching: boolean) => {
  return {
    opacity: isFetching ? 1 : 0,
  };
};

export interface AssetInventoryBarChartProps {
  isLoading: boolean;
  isFetching: boolean;
  assetInventoryChartData: AssetInventoryChartData[];
}

export const AssetInventoryBarChart = ({
  isLoading,
  isFetching,
  assetInventoryChartData,
}: AssetInventoryBarChartProps) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs');
  const baseTheme = useElasticChartsTheme();
  return (
    <div css={getChartStyles(euiTheme, xsFontSize)}>
      {/* eslint-disable-next-line @elastic/eui/prefer-css-prop-for-static-styles */}
      <EuiProgress size="xs" color="accent" style={getProgressStyle(isFetching)} />
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
          <Settings
            baseTheme={baseTheme}
            theme={{
              legend: {
                spacingBuffer: 120,
                labelOptions: {
                  maxLines: 1,
                },
              },
              chartMargins: {
                top: 16,
                right: 0,
                bottom: 0,
                left: 0,
              },
              axes: {
                axisTitle: {
                  fontSize: euiTheme.font.scale.xs * euiTheme.base, // convert rem -> px
                },
              },
            }}
            showLegend={true}
            animateData={true}
            legendPosition={Position.Right}
            legendSize={250}
            legendAction={(param) => {
              const seriesData = assetInventoryChartData.find(
                (data) => data[ASSET_FIELDS.ENTITY_SUB_TYPE] === param.label
              );
              const count = !seriesData ? 0 : getAbbreviatedNumber(seriesData.count);
              return <span>{count}</span>;
            }}
          />
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
            id="grouped-entity-types"
            xScaleType={ScaleType.Ordinal}
            yScaleType={ScaleType.Linear}
            xAccessor={ASSET_FIELDS.ENTITY_TYPE}
            yAccessors={['count']}
            yNice={true}
            splitSeriesAccessors={[ASSET_FIELDS.ENTITY_SUB_TYPE]}
            stackAccessors={[ASSET_FIELDS.ENTITY_TYPE]}
            minBarHeight={1}
            data={assetInventoryChartData}
          />
        </Chart>
      )}
    </div>
  );
};
