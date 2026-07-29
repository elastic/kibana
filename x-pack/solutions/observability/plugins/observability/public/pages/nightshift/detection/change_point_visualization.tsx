/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import {
  AnnotationDomainType,
  BarSeries,
  BubbleSeries,
  Chart,
  LineAnnotation,
  PointShape,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { ChangePointType } from '@kbn/significant-events-schema';
import {
  getChangePointLabel,
  getOccurrenceBucketIntervalMs,
  type OccurrencePoint,
} from './change_point';
import { useChartThemes } from '../../../hooks/use_chart_themes';
import { ChangePointAnnotationTooltip } from './change_point_annotation_tooltip';

const SPARKLINE_HEIGHT = 32;
const SPARKLINE_WIDTH = 64;
const SPARKLINE_MARKER_MARGIN = 6;

const DEFAULT_ANNOTATION_INTERVAL_MS = getOccurrenceBucketIntervalMs();

const getChangePointAnnotation = (
  data: readonly OccurrencePoint[],
  timestamp: string
):
  | {
      changePointAt: number;
      changePointTimestamp: number;
      changePointMarker: OccurrencePoint[];
      interval: number;
    }
  | undefined => {
  const changePointTimestamp = new Date(timestamp).getTime();
  if (!Number.isFinite(changePointTimestamp) || data.length === 0) {
    return undefined;
  }

  const closestPoint = data.reduce((closest, point) =>
    Math.abs(point.x - changePointTimestamp) < Math.abs(closest.x - changePointTimestamp)
      ? point
      : closest
  );
  const firstInterval = data.length > 1 ? Math.abs(data[1].x - data[0].x) : 0;

  return {
    changePointAt: closestPoint.x,
    changePointTimestamp,
    changePointMarker: [closestPoint],
    interval: firstInterval || DEFAULT_ANNOTATION_INTERVAL_MS,
  };
};

export function ChangePointSparkline({
  changePointType,
  data,
  timestamp,
}: {
  changePointType?: ChangePointType;
  data: OccurrencePoint[];
  timestamp: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { baseTheme, sparklineTheme } = useChartThemes();
  const changePointLabel = getChangePointLabel(changePointType);
  const annotation = getChangePointAnnotation(data, timestamp);

  if (data.length === 0) {
    return (
      <div
        data-test-subj="nightshiftDetectionSparklineEmpty"
        css={css`
          align-items: center;
          display: flex;
          height: ${SPARKLINE_HEIGHT}px;
          justify-content: center;
          width: ${SPARKLINE_WIDTH}px;
        `}
      >
        <EuiText size="xs" color="subdued">
          &mdash;
        </EuiText>
      </div>
    );
  }

  return (
    <Chart
      data-test-subj="nightshiftDetectionSparkline"
      size={{ height: SPARKLINE_HEIGHT, width: SPARKLINE_WIDTH }}
    >
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
      {annotation && (
        <>
          <LineAnnotation
            id="detection-change-point"
            domainType={AnnotationDomainType.XDomain}
            dataValues={[{ dataValue: annotation.changePointAt }]}
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
                  x0: annotation.changePointAt - annotation.interval / 2,
                  x1: annotation.changePointAt + annotation.interval / 2,
                },
              },
            ]}
            style={{ fill: euiTheme.colors.danger, opacity: 0 }}
            customTooltip={() => (
              <ChangePointAnnotationTooltip
                changePointLabel={changePointLabel}
                timestamp={annotation.changePointTimestamp}
              />
            )}
          />
        </>
      )}
      <BarSeries
        id="detection-sparkline"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        data={data}
        xAccessor="x"
        yAccessors={['y']}
        color={euiTheme.colors.vis.euiColorVis0}
      />
      {annotation && (
        <BubbleSeries
          id="detection-change-point-marker"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          data={annotation.changePointMarker}
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
      )}
    </Chart>
  );
}
