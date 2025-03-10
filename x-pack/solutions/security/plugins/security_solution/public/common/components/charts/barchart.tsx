/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { SettingsProps } from '@elastic/charts';
import { Chart, BarSeries, Axis, Position, ScaleType, Settings } from '@elastic/charts';
import { getOr, get, isNumber } from 'lodash/fp';
import deepmerge from 'deepmerge';
import { v4 as uuidv4 } from 'uuid';
import styled from '@emotion/styled';
import deepEqual from 'fast-deep-equal';

import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { useTimeZone } from '../../lib/kibana';
import { useThrottledResizeObserver } from '../utils';
import { hasValueToDisplay } from '../../utils/validators';
import { EMPTY_VALUE_LABEL } from './translation';

import { ChartPlaceHolder } from './chart_place_holder';
import {
  chartDefaultSettings,
  checkIfAllValuesAreZero,
  getChartHeight,
  getChartWidth,
  WrappedByAutoSizer,
  useThemes,
  Wrapper,
  BarChartWrapper,
} from './common';
import { DraggableLegend } from './draggable_legend';
import type { LegendItem } from './draggable_legend_item';
import type { ChartData, ChartSeriesConfigs, ChartSeriesData } from './common';
import { VisualizationActions } from '../visualization_actions/actions';
import type { VisualizationActionsProps } from '../visualization_actions/types';
import { HoverVisibilityContainer } from '../hover_visibility_container';
import { VISUALIZATION_ACTIONS_BUTTON_CLASS } from '../visualization_actions/utils';

const LegendFlexItem = styled(EuiFlexItem)`
  overview: hidden;
`;

const checkIfAllTheDataInTheSeriesAreValid = (series: ChartSeriesData): series is ChartSeriesData =>
  series != null &&
  !!get('value.length', series) &&
  (series.value || []).every(({ x, y }) => isNumber(y) && y >= 0);

const checkIfAnyValidSeriesExist = (
  data: ChartSeriesData[] | null | undefined
): data is ChartSeriesData[] =>
  Array.isArray(data) &&
  !checkIfAllValuesAreZero(data) &&
  data.some(checkIfAllTheDataInTheSeriesAreValid);

const yAccessors = ['y'];
const splitSeriesAccessors = [
  (datum: ChartData) => (hasValueToDisplay(datum.g) ? datum.g : EMPTY_VALUE_LABEL),
];

// Bar chart rotation: https://ela.st/chart-rotations
export const BarChartBaseComponent = ({
  data,
  forceHiddenLegend = false,
  yAxisTitle,
  ...chartConfigs
}: {
  data: ChartSeriesData[];
  width: string | null | undefined;
  height: string | null | undefined;
  yAxisTitle?: string | undefined;
  configs?: ChartSeriesConfigs | undefined;
  forceHiddenLegend?: boolean;
}) => {
  const themes = useThemes();
  const timeZone = useTimeZone();
  const xTickFormatter = get('configs.axis.xTickFormatter', chartConfigs);
  const yTickFormatter = get('configs.axis.yTickFormatter', chartConfigs);
  const tickSize = getOr(0, 'configs.axis.tickSize', chartConfigs);
  const xAxisId = `stat-items-barchart-${data[0].key}-x`;
  const yAxisId = `stat-items-barchart-${data[0].key}-y`;
  const settings: SettingsProps = {
    ...chartDefaultSettings,
    ...deepmerge(get('configs.settings', chartConfigs), themes),
  };

  const xAxisStyle = useMemo(
    () =>
      deepmerge(
        {
          tickLine: {
            size: tickSize,
          },
        },
        getOr({}, 'configs.axis.bottom.style', chartConfigs)
      ),
    [chartConfigs, tickSize]
  );

  const yAxisStyle = useMemo(
    () =>
      deepmerge(
        {
          tickLine: {
            size: tickSize,
          },
        },
        getOr({}, 'configs.axis.left.style', chartConfigs)
      ),
    [chartConfigs, tickSize]
  );

  const xAxisLabelFormat = get('configs.axis.bottom.labelFormat', chartConfigs);

  return chartConfigs.width && chartConfigs.height ? (
    <Chart>
      <Settings
        {...settings}
        showLegend={settings.showLegend && !forceHiddenLegend}
        locale={i18n.getLocale()}
      />
      {data.map((series) => {
        const barSeriesKey = series.key;
        return checkIfAllTheDataInTheSeriesAreValid(series) ? (
          <BarSeries
            id={barSeriesKey}
            key={barSeriesKey}
            name={series.key}
            xScaleType={getOr(ScaleType.Linear, 'configs.series.xScaleType', chartConfigs)}
            yScaleType={getOr(ScaleType.Linear, 'configs.series.yScaleType', chartConfigs)}
            xAccessor="x"
            yAccessors={yAccessors}
            timeZone={timeZone}
            splitSeriesAccessors={splitSeriesAccessors}
            data={series.value ?? []}
            stackAccessors={get('configs.series.stackAccessors', chartConfigs)}
            color={series.color ? series.color : undefined}
            barSeriesStyle={get('configs.series.barSeriesStyle', chartConfigs)}
          />
        ) : null;
      })}

      <Axis
        id={xAxisId}
        position={Position.Bottom}
        showOverlappingTicks={false}
        style={xAxisStyle}
        tickFormat={xTickFormatter}
        labelFormat={xAxisLabelFormat}
      />

      <Axis
        id={yAxisId}
        position={Position.Left}
        style={yAxisStyle}
        tickFormat={yTickFormatter}
        title={yAxisTitle}
      />
    </Chart>
  ) : null;
};

BarChartBaseComponent.displayName = 'BarChartBaseComponent';

export const BarChartBase = React.memo(BarChartBaseComponent);

BarChartBase.displayName = 'BarChartBase';

export interface BarChartComponentProps {
  barChart: ChartSeriesData[] | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
  stackByField?: string;
  scopeId?: string;
  visualizationActionsOptions?: VisualizationActionsProps;
}

const NO_LEGEND_DATA: LegendItem[] = [];

export const BarChartComponent: React.FC<BarChartComponentProps> = ({
  barChart,
  configs,
  stackByField,
  scopeId,
  visualizationActionsOptions,
}) => {
  const { ref: measureRef, width, height } = useThrottledResizeObserver();
  const legendItems: LegendItem[] = useMemo(
    () =>
      barChart != null && stackByField != null
        ? barChart.map((d) => ({
            color: d.color,
            dataProviderId: escapeDataProviderId(
              `draggable-legend-item-${uuidv4()}-${stackByField}-${d.key}`
            ),
            scopeId,
            field: stackByField,
            value: d.key,
          }))
        : NO_LEGEND_DATA,
    [barChart, stackByField, scopeId]
  );

  const yAxisTitle = get('yAxisTitle', configs);
  const customHeight = get('customHeight', configs);
  const customWidth = get('customWidth', configs);
  const chartHeight = getChartHeight(customHeight, height);
  const chartWidth = getChartWidth(customWidth, width);
  const isValidSeriesExist = useMemo(() => checkIfAnyValidSeriesExist(barChart), [barChart]);

  return (
    <Wrapper>
      <HoverVisibilityContainer targetClassNames={[VISUALIZATION_ACTIONS_BUTTON_CLASS]}>
        {isValidSeriesExist && barChart && (
          <BarChartWrapper gutterSize="none">
            <EuiFlexItem grow={true}>
              <WrappedByAutoSizer ref={measureRef} height={chartHeight}>
                <BarChartBase
                  configs={configs}
                  data={barChart}
                  yAxisTitle={yAxisTitle}
                  forceHiddenLegend={stackByField != null}
                  height={chartHeight}
                  width={chartHeight}
                />
              </WrappedByAutoSizer>
            </EuiFlexItem>

            <LegendFlexItem grow={false}>
              <DraggableLegend legendItems={legendItems} height={height} />
            </LegendFlexItem>
          </BarChartWrapper>
        )}
        {!isValidSeriesExist && (
          <ChartPlaceHolder height={chartHeight} width={chartWidth} data={barChart} />
        )}
        {visualizationActionsOptions != null && (
          <VisualizationActions {...visualizationActionsOptions} className="viz-actions" />
        )}
      </HoverVisibilityContainer>
    </Wrapper>
  );
};

export const BarChart = React.memo(
  BarChartComponent,
  (prevProps, nextProps) =>
    prevProps.stackByField === nextProps.stackByField &&
    prevProps.scopeId === nextProps.scopeId &&
    deepEqual(prevProps.configs, nextProps.configs) &&
    deepEqual(prevProps.barChart, nextProps.barChart)
);
