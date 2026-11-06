/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  BarSeries,
  Chart,
  CurveType,
  LineAnnotation,
  Position,
  ScaleType,
  Settings,
  niceTimeFormatter,
  type BrushEndListener,
  type SeriesColorAccessorFn,
} from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import {
  CATEGORY_BY_KIND,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  eventTime,
  getBucketMs,
  type ScorePoint,
  type TimeWindow,
} from './lens';
import type { EntityTimelineCategory, EntityTimelineEvent } from './types';
import { useCategoryColors } from './use_category_colors';

const CHART_HEIGHT = 96;

interface TimelineChartProps {
  mode: 'density' | 'score';
  events: EntityTimelineEvent[];
  scorePoints?: ScorePoint[];
  window: TimeWindow;
  onBrush: (window: TimeWindow) => void;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({
  mode,
  events,
  scorePoints = [],
  window,
  onBrush,
}) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const categoryColors = useCategoryColors();
  const bucketMs = getBucketMs(window);

  const density = useMemo(() => {
    const buckets = new Map<string, { x: number; category: string; count: number }>();
    events.forEach((event) => {
      const x = Math.floor(eventTime(event) / bucketMs) * bucketMs;
      const category = CATEGORY_BY_KIND[event.kind];
      const key = `${x}-${category}`;
      const count = event.kind === 'alert_burst' ? event.alertCount ?? 1 : 1;
      const bucket = buckets.get(key);
      if (bucket) bucket.count += count;
      else buckets.set(key, { x, category: CATEGORY_LABELS[category], count });
    });
    return Array.from(buckets.values()).sort(
      (a, b) =>
        a.x - b.x ||
        CATEGORY_ORDER.indexOf(categoryKey(a.category)) -
          CATEGORY_ORDER.indexOf(categoryKey(b.category))
    );
  }, [events, bucketMs]);

  const colorAccessor = useCallback<SeriesColorAccessorFn>(
    (series) => {
      const label = series.splitAccessors.get('category');
      return categoryColors[categoryKey(String(label))] ?? euiTheme.colors.mediumShade;
    },
    [categoryColors, euiTheme.colors.mediumShade]
  );

  const onBrushEnd = useCallback<BrushEndListener>(
    (brush) => {
      if ('x' in brush && brush.x) {
        const [from, to] = brush.x;
        onBrush({ from: Number(from), to: Number(to) });
      }
    },
    [onBrush]
  );

  const timeFormatter = useMemo(() => niceTimeFormatter([window.from, window.to]), [window]);

  return (
    <Chart size={{ height: CHART_HEIGHT }}>
      <Settings
        baseTheme={baseTheme}
        theme={{ chartMargins: { top: 4, bottom: 0, left: 0, right: 0 } }}
        showLegend={false}
        onBrushEnd={onBrushEnd}
        xDomain={{ min: window.from, max: window.to, minInterval: bucketMs }}
        locale="en"
      />
      <Axis
        id="entityTimelineTime"
        position={Position.Bottom}
        tickFormat={timeFormatter}
        ticks={4}
      />
      {mode === 'density' ? (
        <>
          <Axis id="entityTimelineCount" position={Position.Left} ticks={2} hide />
          <BarSeries
            id="entityTimelineDensity"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['count']}
            splitSeriesAccessors={['category']}
            stackAccessors={['x']}
            color={colorAccessor}
            data={density}
          />
        </>
      ) : (
        <>
          <Axis
            id="entityTimelineScore"
            position={Position.Left}
            domain={{ min: 0, max: 100 }}
            ticks={3}
          />
          <LineAnnotation
            id="entityTimelineCriticalThreshold"
            domainType={AnnotationDomainType.YDomain}
            dataValues={[{ dataValue: 90, details: 'Critical (90+)' }]}
            style={{ line: { stroke: euiTheme.colors.danger, strokeWidth: 1, opacity: 0.6 } }}
          />
          <AreaSeries
            id="entityTimelineRunningScore"
            name="Risk score"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            curve={CurveType.CURVE_STEP_AFTER}
            color={euiTheme.colors.danger}
            data={scorePoints}
          />
        </>
      )}
    </Chart>
  );
};

const categoryKey = (label: string): EntityTimelineCategory =>
  (Object.entries(CATEGORY_LABELS).find(([, value]) => value === label)?.[0] ??
    'detections') as EntityTimelineCategory;
