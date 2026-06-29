/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Chart,
  Heatmap,
  type HeatmapStyle,
  type RecursivePartial,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiFlexItem } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import dateMath from '@kbn/datemath';
import React, { useMemo } from 'react';
import { getAnomalyChartStyling } from '../recent_anomalies/anomaly_chart_styling';
import type { AnomalyBand } from '../recent_anomalies/anomaly_bands';
import {
  BEHAVIORAL_ANOMALIES_BUCKET_INTERVAL_HOURS,
  BEHAVIORAL_ANOMALIES_TIME_RANGE,
} from './constants';

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

const resolveTimeMillis = (value: string): number => {
  const parsed = dateMath.parse(value)?.valueOf();
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }
  const native = new Date(value).getTime();
  return Number.isFinite(native) ? native : Date.now();
};

const useLast24HoursInMillis = () =>
  useMemo(() => {
    const from = resolveTimeMillis(BEHAVIORAL_ANOMALIES_TIME_RANGE.from);
    const to = resolveTimeMillis(BEHAVIORAL_ANOMALIES_TIME_RANGE.to);
    return { from, to };
  }, []);

/** Formats x-axis ticks as hours (e.g. "09:00") for the 24-hour swim lane. */
const formatHourTick = (value: string | number): string => {
  const ms = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(ms)) {
    return '';
  }
  const hours = new Date(ms).getUTCHours();
  return `${hours.toString().padStart(2, '0')}:00`;
};

interface BehavioralAnomaliesSwimlaneProps {
  records: Array<Record<string, unknown>>;
  anomalyBands: AnomalyBand[];
  entityNames: string[];
  entityAccessor: string;
  heatmapId: string;
}

/**
 * Single-row anomaly swim lane for the last 24 hours (1 bucket per hour).
 * Uses hard-coded prototype data; x-axis labels show hours.
 */
export const BehavioralAnomaliesSwimlane: React.FC<BehavioralAnomaliesSwimlaneProps> = ({
  records,
  anomalyBands,
  entityNames,
  entityAccessor,
  heatmapId,
}) => {
  const { from, to } = useLast24HoursInMillis();
  const xDomain = useMemo(() => ({ min: from, max: to }), [from, to]);
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
              value: BEHAVIORAL_ANOMALIES_BUCKET_INTERVAL_HOURS,
              unit: 'h',
            },
          }}
          colorScale={{
            type: 'bands',
            bands: chartBands,
          }}
          data={records}
          name={i18n.translate(
            'xpack.securitySolution.entityAnalytics.behavioralAnomalies.heatmap.maxAnomalyScore',
            { defaultMessage: 'Max anomaly score' }
          )}
          xAccessor="@timestamp"
          xAxisLabelName={i18n.translate(
            'xpack.securitySolution.entityAnalytics.behavioralAnomalies.heatmap.xAxis',
            { defaultMessage: 'Hour' }
          )}
          xAxisLabelFormatter={formatHourTick}
          yAccessor={entityAccessor}
          yAxisLabelName={entityAccessor}
          ySortPredicate="numDesc"
          valueAccessor="record_score"
        />
      </Chart>
    </EuiFlexItem>
  );
};
