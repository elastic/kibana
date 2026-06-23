/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Chart,
  Heatmap,
  type HeatmapSpec,
  type HeatmapStyle,
  type RecursivePartial,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiFlexItem } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { getAnomalyChartStyling } from '../recent_anomalies/anomaly_chart_styling';
import type { AnomalyBand } from '../recent_anomalies/anomaly_bands';

const heatmapComponentStyle: RecursivePartial<HeatmapStyle> = {
  brushTool: {
    visible: false,
  },
  cell: {
    maxWidth: 'fill',
    label: {
      visible: false,
    },
    border: {
      stroke: 'transparent',
      strokeWidth: 0,
    },
  },
  xAxisLabel: {
    fontSize: 12,
    padding: { top: 10, bottom: 10 },
  },
  yAxisLabel: {
    visible: false,
    fontSize: 14,
    width: 'auto',
    padding: { left: 10, right: 10 },
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Bucket interval shape accepted by `@elastic/charts` Heatmap `xScale.interval`. */
interface BucketInterval {
  value: number;
  unit: 'h' | 'd';
}

/**
 * Picks an x-axis bucket size that gives a readable column count across the
 * selected range — hourly for short ranges, daily for the default 30-day
 * window / a couple of months, and weekly for anything longer (e.g. when
 * the user picks "Last 1 year" from the quick-select dropdown).
 */
const deriveBucketInterval = (timeRangeMs: { from: number; to: number }): BucketInterval => {
  const spanMs = Math.max(0, timeRangeMs.to - timeRangeMs.from);
  if (spanMs <= 2 * DAY_MS) {
    return { value: 1, unit: 'h' };
  }
  if (spanMs <= 30 * DAY_MS) {
    return { value: 1, unit: 'd' };
  }
  return { value: 7, unit: 'd' };
};

const dateLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** Formats x-axis ticks as "May 25, 2026". */
const formatDateTick = (value: string | number): string => {
  const ms = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(ms)) {
    return '';
  }
  return dateLabelFormatter.format(new Date(ms));
};

interface BehavioralAnomaliesV3SwimlaneProps {
  records: Array<Record<string, unknown>>;
  anomalyBands: AnomalyBand[];
  entityNames: string[];
  entityAccessor: string;
  heatmapId: string;
  /**
   * Currently selected timeline window (millis). Drives the chart's xDomain
   * and the derived bucket interval — re-renders whenever the time picker
   * selection changes.
   */
  timeRangeMs: { from: number; to: number };
  /**
   * Optional Y-axis sort predicate. Defaults to `numDesc` to preserve previous
   * behavior; pass a custom comparator when rows have a meaningful order that
   * isn't alphabetic or numeric (e.g. MITRE tactics in kill-chain order).
   */
  ySortPredicate?: HeatmapSpec['ySortPredicate'];
}

/**
 * BA-v.3 prototype anomaly swim lane. The chart window and x-axis bucket size
 * are driven by the time picker in `anomaly_timeline_section.tsx`; x-axis
 * labels are rendered as "May 25, 2026" dates regardless of bucket size.
 */
export const BehavioralAnomaliesV3Swimlane: React.FC<BehavioralAnomaliesV3SwimlaneProps> = ({
  records,
  anomalyBands,
  entityNames,
  entityAccessor,
  heatmapId,
  timeRangeMs,
  ySortPredicate = 'numDesc',
}) => {
  const xDomain = useMemo(
    () => ({ min: timeRangeMs.from, max: timeRangeMs.to }),
    [timeRangeMs.from, timeRangeMs.to]
  );
  const bucketInterval = useMemo(() => deriveBucketInterval(timeRangeMs), [timeRangeMs]);
  const chartBands = useMemo(
    () => anomalyBands.map(({ start, end, color }) => ({ start, end, color })),
    [anomalyBands]
  );
  const styling = getAnomalyChartStyling(true);
  const baseTheme = useElasticChartsTheme();

  return (
    <EuiFlexItem
      css={{
        height: `${styling.heightOfHeatmap(entityNames.length)}px`,
      }}
    >
      <Chart>
        <Settings
          baseTheme={baseTheme}
          theme={{ heatmap: heatmapComponentStyle }}
          xDomain={xDomain}
        />
        <Heatmap
          id={heatmapId}
          xScale={{
            type: ScaleType.Time,
            interval: {
              type: 'fixed',
              value: bucketInterval.value,
              unit: bucketInterval.unit,
            },
          }}
          colorScale={{
            type: 'bands',
            bands: chartBands,
          }}
          data={records}
          name={i18n.translate(
            'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.heatmap.maxAnomalyScore',
            { defaultMessage: 'Max anomaly score' }
          )}
          xAccessor="@timestamp"
          xAxisLabelName={i18n.translate(
            'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.heatmap.xAxis',
            { defaultMessage: 'Date' }
          )}
          xAxisLabelFormatter={formatDateTick}
          yAccessor={entityAccessor}
          yAxisLabelName={entityAccessor}
          ySortPredicate={ySortPredicate}
          valueAccessor="record_score"
        />
      </Chart>
    </EuiFlexItem>
  );
};
