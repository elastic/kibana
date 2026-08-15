/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
} from '@elastic/charts';
import { EuiPanel, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import React, { useMemo } from 'react';
import {
  OTHER_ERROR_TREND_ID,
  stackErrorTrends,
  type RumErrorGroup,
} from '../../../../common/rum_app';

export function ErrorsOverTimeChart({ groups }: { groups: RumErrorGroup[] }) {
  const { euiTheme } = useEuiTheme();
  const { baseTheme, theme } = useChartThemes();
  const series = useMemo(() => stackErrorTrends(groups), [groups]);
  const visColors = [
    euiTheme.colors.vis.euiColorVis0,
    euiTheme.colors.vis.euiColorVis1,
    euiTheme.colors.vis.euiColorVis2,
    euiTheme.colors.vis.euiColorVis3,
    euiTheme.colors.vis.euiColorVis4,
    euiTheme.colors.vis.euiColorVis5,
  ];
  const otherLabel = i18n.translate('xpack.ux.errors.overTime.otherLabel', {
    defaultMessage: 'Other',
  });
  const hasData = series.some((item) => item.points.some((point) => point.count > 0));
  const xExtents: [number, number] = (() => {
    const xs = series.flatMap((item) =>
      item.points.map((point) => new Date(point.timestamp).getTime())
    );
    return xs.length > 0 ? [Math.min(...xs), Math.max(...xs)] : [0, 1];
  })();
  const tickFormat = niceTimeFormatter(xExtents);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="uxErrorsOverTimeChart">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.ux.errors.overTimeTitle', {
            defaultMessage: 'Errors over time',
          })}
        </h3>
      </EuiTitle>
      <div
        css={css`
          height: 180px;
          width: 100%;
          margin-top: 8px;
        `}
      >
        {!hasData ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.ux.errors.overTime.emptyDescription', {
              defaultMessage: 'No error events in this range',
            })}
          </EuiText>
        ) : (
          <Chart size={{ height: 180, width: '100%' }}>
            <Settings
              baseTheme={baseTheme}
              theme={[
                {
                  chartMargins: { left: 0, right: 4, top: 8, bottom: 0 },
                  chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
                  background: { color: 'transparent' },
                },
                ...theme,
              ]}
              showLegend
              legendPosition={Position.Right}
              locale={i18n.getLocale()}
            />
            <Tooltip headerFormatter={({ value }) => tickFormat(Number(value))} />
            <Axis
              id="errors-over-time-y"
              position={Position.Left}
              ticks={3}
              domain={{ min: 0, max: NaN }}
              style={{
                tickLine: { visible: false },
                axisLine: { visible: false },
              }}
            />
            <Axis
              id="errors-over-time-x"
              position={Position.Bottom}
              ticks={4}
              tickFormat={tickFormat}
              timeAxisLayerCount={1}
              style={{
                tickLine: { visible: false },
                axisLine: { visible: false },
              }}
            />
            {series.map((item, index) => (
              <BarSeries
                key={item.id}
                id={item.id}
                name={item.id === OTHER_ERROR_TREND_ID ? otherLabel : item.name}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                stackAccessors={['x']}
                color={
                  item.id === OTHER_ERROR_TREND_ID
                    ? euiTheme.colors.mediumShade
                    : visColors[index % visColors.length]
                }
                data={item.points.map((point) => ({
                  x: new Date(point.timestamp).getTime(),
                  y: point.count,
                }))}
              />
            ))}
          </Chart>
        )}
      </div>
    </EuiPanel>
  );
}
