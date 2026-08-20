/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { BarStyleAccessor, ElementClickListener, XYChartElementEvent } from '@elastic/charts';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import {
  EuiEmptyPrompt,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';

import type { BreakdownCount } from '../../../common/detonate';
import { CHART_FILTER_HINT } from '../translations';

const DEFAULT_HEIGHT = 320;

export interface BreakdownChartProps {
  title: string;
  subtitle: string;
  data: BreakdownCount[];
  /** Localised label for a bar. Defaults to the raw key. */
  renderLabel?: (key: string) => string;
  /** Keys currently filtered on, highlighted while the rest are muted. */
  selected: string[];
  onToggle: (key: string) => void;
  axisTitle: string;
  emptyMessage: string;
  color: string;
  height?: number;
  isLoading: boolean;
  dataTestSubj: string;
}

/**
 * Horizontal bar breakdown that doubles as a filter control.
 *
 * Bars describe the same detonations as the table, except that the chart's own filter is left
 * out, so it keeps showing what else could be selected after a filter is applied. Charts are not
 * keyboard operable, so every dimension charted here is also offered in the filter bar.
 */
const BreakdownChartComponent: React.FC<BreakdownChartProps> = ({
  title,
  subtitle,
  data,
  renderLabel,
  selected,
  onToggle,
  axisTitle,
  emptyMessage,
  color,
  height = DEFAULT_HEIGHT,
  isLoading,
  dataTestSubj,
}) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  // Bars fill the rotated axis top-down in data order, so sorting here puts the largest at the top.
  const chartData = useMemo(() => [...data].sort((a, b) => b.count - a.count), [data]);

  const labelFor = useCallback((key: string) => renderLabel?.(key) ?? key, [renderLabel]);

  const ariaDescription = useMemo(
    () => `${subtitle.replace(/\.$/, '')}. ${CHART_FILTER_HINT}`,
    [subtitle]
  );

  const onElementClick = useCallback<ElementClickListener>(
    ([element]) => {
      const [geometry] = element as XYChartElementEvent;
      if (typeof geometry?.x === 'string') {
        onToggle(geometry.x);
      }
    },
    [onToggle]
  );

  const styleAccessor = useCallback<BarStyleAccessor>(
    (datum) => {
      if (selected.length === 0 || (typeof datum.x === 'string' && selected.includes(datum.x))) {
        return null;
      }
      return euiTheme.colors.lightShade;
    },
    [selected, euiTheme.colors.lightShade]
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {subtitle}
      </EuiText>
      {isLoading ? (
        <EuiLoadingChart size="l" />
      ) : chartData.length === 0 ? (
        <EuiEmptyPrompt iconType="visBarVertical" body={<p>{emptyMessage}</p>} />
      ) : (
        <div
          css={css`
            cursor: pointer;
          `}
        >
          <Chart size={{ height }}>
            <Settings
              baseTheme={baseTheme}
              rotation={90}
              showLegend={false}
              locale={i18n.getLocale()}
              onElementClick={onElementClick}
              ariaLabel={title}
              ariaDescription={ariaDescription}
            />
            <Axis id="categories" position={Position.Left} tickFormat={labelFor} />
            <Axis id="counts" position={Position.Bottom} title={axisTitle} />
            <BarSeries
              id={dataTestSubj}
              xScaleType={ScaleType.Ordinal}
              yScaleType={ScaleType.Linear}
              xAccessor="key"
              yAccessors={['count']}
              data={chartData}
              color={color}
              styleAccessor={styleAccessor}
            />
          </Chart>
        </div>
      )}
    </EuiPanel>
  );
};

export const BreakdownChart = React.memo(BreakdownChartComponent);
