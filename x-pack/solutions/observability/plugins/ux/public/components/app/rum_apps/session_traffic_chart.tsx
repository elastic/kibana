/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, BarSeries, Chart, Position, ScaleType, Settings, Tooltip } from '@elastic/charts';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import React, { useMemo } from 'react';
import type { RumSessionTrafficPoint } from '../../../../common/rum_apps';
import { formatSessionTrafficAxis, formatSessionTrafficTooltip } from './session_traffic_axis';

const hideChartLabel = i18n.translate('xpack.ux.inventory.hideChartButtonLabel', {
  defaultMessage: 'Hide chart',
});

export function SessionTrafficChart({
  points,
  onHide,
}: {
  points: RumSessionTrafficPoint[];
  onHide: () => void;
}) {
  const { baseTheme, theme } = useChartThemes();
  const data = useMemo(
    () => points.map((point) => ({ x: point.timestamp, y: point.sessions })),
    [points]
  );
  const hasData = data.some((point) => point.y > 0);
  const xExtents: [number, number] = useMemo(() => {
    if (data.length === 0) {
      return [0, 1];
    }
    return [data[0].x, data[data.length - 1].x];
  }, [data]);
  const spanMs = Math.max(0, xExtents[1] - xExtents[0]);
  const locale = i18n.getLocale();
  const tickFormat = (value: number): string => formatSessionTrafficAxis(value, spanMs, locale);
  const tooltipFormat = (value: number): string =>
    formatSessionTrafficTooltip(value, spanMs, locale);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="uxAppsSessionTrafficChart">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.ux.inventory.sessionTrafficTitle', {
                defaultMessage: 'Sessions',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={hideChartLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="transitionTopOut"
              aria-label={hideChartLabel}
              onClick={onHide}
              data-test-subj="uxAppsHideChartButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          height: 140px;
          width: 100%;
          margin-top: 8px;
        `}
      >
        {!hasData ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.ux.inventory.sessionTrafficEmptyDescription', {
              defaultMessage: 'No sessions in this time range',
            })}
          </EuiText>
        ) : (
          <Chart size={{ height: 140, width: '100%' }}>
            <Settings
              baseTheme={baseTheme}
              theme={[
                {
                  chartMargins: { left: 0, right: 8, top: 8, bottom: 16 },
                  chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
                  background: { color: 'transparent' },
                  scales: { barsPadding: 0.18 },
                },
                ...theme,
              ]}
              showLegend={false}
              locale={locale}
            />
            <Tooltip headerFormatter={({ value }) => tooltipFormat(Number(value))} />
            <Axis
              id="ux-session-traffic-y"
              position={Position.Left}
              ticks={3}
              domain={{ min: 0, max: NaN }}
              style={{
                tickLine: { visible: false },
                axisLine: { visible: false },
              }}
            />
            <Axis
              id="ux-session-traffic-x"
              position={Position.Bottom}
              ticks={4}
              timeAxisLayerCount={0}
              tickFormat={(value) => tickFormat(Number(value))}
              showOverlappingLabels={false}
              showOverlappingTicks={false}
              style={{
                tickLine: { visible: false },
                axisLine: { visible: false },
              }}
            />
            <BarSeries
              id="sessions"
              name={i18n.translate('xpack.ux.inventory.sessionTrafficSeriesLabel', {
                defaultMessage: 'Sessions',
              })}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={data}
              enableHistogramMode
              barSeriesStyle={{
                rect: { opacity: 0.85 },
              }}
            />
          </Chart>
        )}
      </div>
    </EuiPanel>
  );
}
