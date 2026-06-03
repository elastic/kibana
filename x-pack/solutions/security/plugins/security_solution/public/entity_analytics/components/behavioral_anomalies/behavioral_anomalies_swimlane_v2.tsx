/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype "v.2" swim lane for the right-panel Behavioral anomalies overview.
 * Always renders the last 1 year with 7-day buckets and a "May 25, 2026"
 * x-axis. Cleanup: delete this file together with
 * `behavioral_anomalies_overview_v2.tsx` and `mock_data_v2.ts` if v.2 is
 * dropped before hand-off.
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
  BEHAVIORAL_ANOMALIES_V2_BUCKET_DAYS,
  BEHAVIORAL_ANOMALIES_V2_TIME_RANGE,
} from './mock_data_v2';

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

const useLastYearInMillis = () =>
  useMemo(() => {
    const from = resolveTimeMillis(BEHAVIORAL_ANOMALIES_V2_TIME_RANGE.from);
    const to = resolveTimeMillis(BEHAVIORAL_ANOMALIES_V2_TIME_RANGE.to);
    return { from, to };
  }, []);

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

interface BehavioralAnomaliesSwimlaneV2Props {
  records: Array<Record<string, unknown>>;
  anomalyBands: AnomalyBand[];
  entityNames: string[];
  entityAccessor: string;
  heatmapId: string;
}

/**
 * Single-row anomaly swim lane covering the last 1 year (1 bucket per week).
 * Uses hard-coded prototype data; x-axis labels show dates.
 */
export const BehavioralAnomaliesSwimlaneV2: React.FC<BehavioralAnomaliesSwimlaneV2Props> = ({
  records,
  anomalyBands,
  entityNames,
  entityAccessor,
  heatmapId,
}) => {
  const { from, to } = useLastYearInMillis();
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
              value: BEHAVIORAL_ANOMALIES_V2_BUCKET_DAYS,
              unit: 'd',
            },
          }}
          colorScale={{
            type: 'bands',
            bands: chartBands,
          }}
          data={records}
          name={i18n.translate(
            'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2Overview.heatmap.maxAnomalyScore',
            { defaultMessage: 'Max anomaly score' }
          )}
          xAccessor="@timestamp"
          xAxisLabelName={i18n.translate(
            'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2Overview.heatmap.xAxis',
            { defaultMessage: 'Date' }
          )}
          xAxisLabelFormatter={formatDateTick}
          yAccessor={entityAccessor}
          yAxisLabelName={entityAccessor}
          ySortPredicate="numDesc"
          valueAccessor="record_score"
        />
      </Chart>
    </EuiFlexItem>
  );
};
