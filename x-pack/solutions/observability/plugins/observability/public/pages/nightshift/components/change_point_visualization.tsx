/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import {
  AnnotationDomainType,
  Axis,
  BarSeries,
  BubbleSeries,
  Chart,
  LineAnnotation,
  PointShape,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { ChangePointType } from '@kbn/significant-events-schema';
import {
  generateChangePointSeries,
  getChangePointIndex,
  getChangePointLabel,
  getChangePointTimestamp,
  ILLUSTRATIVE_POINT_INTERVAL_MS,
  ILLUSTRATIVE_SERIES_POINTS,
} from '../change_point';
import { useChartThemes } from '../../../hooks/use_chart_themes';
import { ChangePointAnnotationTooltip } from './change_point_annotation_tooltip';

const SPARKLINE_POINTS = 20;
const SPARKLINE_HEIGHT = 32;
const SPARKLINE_WIDTH = 64;
const SPARKLINE_MARKER_MARGIN = 6;

const TREND_CHART_HEIGHT = 160;
const TREND_MARKER_MARGIN = 10;
const TREND_VALUE_SCALE = 25;

function getStreamTypeLabel(streamName?: string): string {
  if (streamName?.startsWith('metrics')) {
    return i18n.translate('xpack.observability.nightshift.detectionFlyout.trend.metricsLabel', {
      defaultMessage: '[Metrics]',
    });
  }
  return i18n.translate('xpack.observability.nightshift.detectionFlyout.trend.logsLabel', {
    defaultMessage: '[Logs]',
  });
}

const buildTimeSeries = (
  changePointType: ChangePointType | undefined,
  endTime: string,
  points: number
): {
  data: Array<{ x: number; y: number }>;
  changePointAt: number;
  changePointMarker: Array<{ x: number; y: number }>;
} => {
  const end = new Date(endTime).getTime();
  const changeIndex = getChangePointIndex(changePointType, points);
  const series = generateChangePointSeries(changePointType, points).map(({ x, y }) => ({
    x: end - (points - 1 - x) * ILLUSTRATIVE_POINT_INTERVAL_MS,
    y: Math.round(y * TREND_VALUE_SCALE),
  }));
  const changePointAt = getChangePointTimestamp(end, changePointType, points);
  return {
    data: series,
    changePointAt,
    changePointMarker: [{ x: changePointAt, y: series[changeIndex]?.y ?? 0 }],
  };
};

export function ChangePointSparkline({
  changePointType,
  timestamp,
}: {
  changePointType?: ChangePointType;
  timestamp: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { baseTheme, sparklineTheme } = useChartThemes();
  const changePointLabel = getChangePointLabel(changePointType);

  const { data, changePointAt, changePointMarker } = useMemo(
    () => buildTimeSeries(changePointType, timestamp, SPARKLINE_POINTS),
    [changePointType, timestamp]
  );

  return (
    <Chart size={{ height: SPARKLINE_HEIGHT, width: SPARKLINE_WIDTH }}>
      <Tooltip type={TooltipType.None} />
      <Settings
        baseTheme={baseTheme}
        theme={[
          sparklineTheme,
          {
            background: { color: 'transparent' },
            chartMargins: { top: SPARKLINE_MARKER_MARGIN, bottom: 0, left: 0, right: 0 },
          },
        ]}
        showLegend={false}
        locale={i18n.getLocale()}
      />
      <LineAnnotation
        id="detection-change-point"
        domainType={AnnotationDomainType.XDomain}
        dataValues={[{ dataValue: changePointAt }]}
        style={{
          line: {
            strokeWidth: 1.5,
            stroke: euiTheme.colors.danger,
            opacity: 1,
          },
        }}
      />
      <RectAnnotation
        id="detection-change-point-tooltip"
        zIndex={10}
        dataValues={[
          {
            coordinates: {
              x0: changePointAt - ILLUSTRATIVE_POINT_INTERVAL_MS / 2,
              x1: changePointAt + ILLUSTRATIVE_POINT_INTERVAL_MS / 2,
            },
          },
        ]}
        style={{ fill: euiTheme.colors.danger, opacity: 0 }}
        customTooltip={() => (
          <ChangePointAnnotationTooltip
            changePointLabel={changePointLabel}
            timestamp={changePointAt}
          />
        )}
      />
      <BarSeries
        id="detection-sparkline"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        data={data}
        xAccessor="x"
        yAccessors={['y']}
        color={euiTheme.colors.vis.euiColorVis0}
      />
      <BubbleSeries
        id="detection-change-point-marker"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        data={changePointMarker}
        xAccessor="x"
        yAccessors={['y']}
        color={euiTheme.colors.danger}
        bubbleSeriesStyle={{
          point: {
            shape: PointShape.Diamond,
            radius: 3.5,
            fill: euiTheme.colors.danger,
            strokeWidth: 0,
            visible: 'always',
          },
        }}
      />
    </Chart>
  );
}

// TODO(#277558): replace with real occurrence timeseries.
export function ChangePointTrendChart({
  changePointType,
  streamName,
  endTime,
}: {
  changePointType?: ChangePointType;
  streamName?: string;
  endTime: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { baseTheme } = useChartThemes();

  const { data, changePointAt, changePointMarker } = useMemo(
    () => buildTimeSeries(changePointType, endTime, ILLUSTRATIVE_SERIES_POINTS),
    [changePointType, endTime]
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      css={css`
        overflow: visible;
      `}
    >
      <EuiText size="xs">
        {`${getStreamTypeLabel(streamName)} ${getChangePointLabel(changePointType)}`}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.observability.nightshift.detectionFlyout.trend.placeholderNote', {
          defaultMessage: 'Illustrative preview — not based on actual occurrence data.',
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <Chart size={{ height: TREND_CHART_HEIGHT }}>
        <Tooltip type={TooltipType.None} />
        <Settings
          baseTheme={baseTheme}
          theme={{
            background: { color: 'transparent' },
            chartMargins: { top: TREND_MARKER_MARGIN },
          }}
          showLegend={false}
          locale={i18n.getLocale()}
        />
        <Axis
          id="left"
          position={Position.Left}
          title={i18n.translate(
            'xpack.observability.nightshift.detectionFlyout.trend.valueAxisLabel',
            { defaultMessage: 'Illustrative count' }
          )}
          ticks={4}
        />
        <Axis
          id="bottom"
          position={Position.Bottom}
          tickFormat={(value) => moment(value).format('HH:mm')}
          ticks={4}
        />
        <LineAnnotation
          id="detection-change-point"
          domainType={AnnotationDomainType.XDomain}
          dataValues={[{ dataValue: changePointAt }]}
          style={{
            line: {
              strokeWidth: 2,
              stroke: euiTheme.colors.danger,
              opacity: 1,
            },
          }}
        />
        <RectAnnotation
          id="detection-change-point-tooltip"
          zIndex={10}
          dataValues={[
            {
              coordinates: {
                x0: changePointAt - ILLUSTRATIVE_POINT_INTERVAL_MS / 2,
                x1: changePointAt + ILLUSTRATIVE_POINT_INTERVAL_MS / 2,
              },
            },
          ]}
          style={{ fill: euiTheme.colors.danger, opacity: 0 }}
          customTooltip={() => (
            <ChangePointAnnotationTooltip
              changePointLabel={getChangePointLabel(changePointType)}
              timestamp={changePointAt}
            />
          )}
        />
        <BarSeries
          id="detection-trend"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          data={data}
          xAccessor="x"
          yAccessors={['y']}
          color={euiTheme.colors.vis.euiColorVis0}
        />
        <BubbleSeries
          id="detection-change-point-marker"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          data={changePointMarker}
          xAccessor="x"
          yAccessors={['y']}
          color={euiTheme.colors.danger}
          bubbleSeriesStyle={{
            point: {
              shape: PointShape.Diamond,
              radius: 5,
              fill: euiTheme.colors.danger,
              strokeWidth: 0,
              visible: 'always',
            },
          }}
        />
      </Chart>
    </EuiPanel>
  );
}
