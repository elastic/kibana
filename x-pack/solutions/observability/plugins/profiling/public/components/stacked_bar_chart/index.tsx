/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomTooltip, SeriesIdentifier, XYChartElementEvent } from '@elastic/charts';
import {
  Axis,
  BrushAxis,
  Chart,
  HistogramBarSeries,
  ScaleType,
  Settings,
  StackMode,
  timeFormatter,
  Tooltip,
  TooltipContainer,
  TooltipHeader,
} from '@elastic/charts';
import { EuiPanel } from '@elastic/eui';
import { keyBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { TopNSample, TopNSubchart } from '../../../common/topn';
import { useKibanaTimeZoneSetting } from '../../hooks/use_kibana_timezone_setting';
import { useProfilingChartsTheme } from '../../hooks/use_profiling_charts_theme';
import { asPercentage } from '../../utils/formatters/as_percentage';
import { SubChart } from '../subchart';

// 2 * padding (16px)
const MAX_TOOLTIP_WIDTH = 224;

export interface StackedBarChartProps {
  height: number;
  asPercentages: boolean;
  onBrushEnd: (range: { rangeFrom: string; rangeTo: string }) => void;
  charts: TopNSubchart[];
  showFrames: boolean;
  onClick?: (selectedChart: TopNSubchart) => void;
}

export function StackedBarChart({
  height,
  asPercentages,
  onBrushEnd,
  charts,
  showFrames,
  onClick,
}: StackedBarChartProps) {
  const chartsbyCategoryMap = useMemo(() => {
    return keyBy(charts, 'Category');
  }, [charts]);

  const timeZone = useKibanaTimeZoneSetting();
  const [highlightedSample, setHighlightedSample] = useState<TopNSample | undefined>();

  const { chartsBaseTheme, chartsTheme } = useProfilingChartsTheme();

  const CustomTooltipWithSubChart: CustomTooltip<{}, SeriesIdentifier> = ({ header }) => {
    if (!highlightedSample) {
      return null;
    }
    const highlightedSubchart = chartsbyCategoryMap[highlightedSample.Category];

    if (!highlightedSubchart) {
      return null;
    }

    return (
      <TooltipContainer>
        <TooltipHeader header={header} />
        <EuiPanel>
          <SubChart
            index={highlightedSubchart.Index}
            color={highlightedSubchart.Color}
            category={highlightedSubchart.Category}
            label={highlightedSubchart.Label}
            data={highlightedSubchart.Series}
            percentage={highlightedSubchart.Percentage}
            sample={highlightedSample}
            showFrames={showFrames}
            height={128}
            width={MAX_TOOLTIP_WIDTH}
            showAxes={false}
            padTitle={false}
            onClick={onClick ? () => onClick(highlightedSubchart) : undefined}
          />
        </EuiPanel>
      </TooltipContainer>
    );
  };

  return (
    <Chart size={{ height }}>
      <Settings
        showLegend={false}
        brushAxis={BrushAxis.X}
        onBrushEnd={(brushEvent) => {
          const rangeFrom = new Date(brushEvent.x![0]).toISOString();
          const rangeTo = new Date(brushEvent.x![1]).toISOString();

          onBrushEnd({ rangeFrom, rangeTo });
        }}
        baseTheme={chartsBaseTheme}
        theme={chartsTheme}
        onElementOver={(events) => {
          const [value] = events[0] as XYChartElementEvent;
          setHighlightedSample(value.datum as TopNSample);
        }}
        onElementClick={
          onClick
            ? (elements) => {
                const [value] = elements[0] as XYChartElementEvent;
                const sample = value.datum as TopNSample;
                onClick(chartsbyCategoryMap[sample.Category]);
              }
            : undefined
        }
        onElementOut={() => {
          setHighlightedSample(undefined);
        }}
        locale={i18n.getLocale()}
      />
      <Tooltip customTooltip={CustomTooltipWithSubChart} />
      {charts.map((chart) => (
        <HistogramBarSeries
          key={chart.Category}
          id={chart.Category}
          name={chart.Label}
          data={chart.Series}
          color={chart.Color}
          xAccessor={'Timestamp'}
          yAccessors={['Count']}
          stackAccessors={['true']}
          stackMode={asPercentages ? StackMode.Percentage : undefined}
          xScaleType={ScaleType.Time}
          timeZone={timeZone}
        />
      ))}
      <Axis id="bottom-axis" position="bottom" tickFormat={timeFormatter('YYYY-MM-DD HH:mm:ss')} />
      <Axis
        id="left-axis"
        position="left"
        gridLine={{ visible: true }}
        tickFormat={(d) => (asPercentages ? asPercentage(d) : d.toFixed(0))}
      />
    </Chart>
  );
}
