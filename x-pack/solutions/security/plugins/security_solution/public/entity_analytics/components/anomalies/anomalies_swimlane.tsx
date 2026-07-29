/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Chart,
  Heatmap,
  type HeatmapCellDatum,
  type HeatmapStyle,
  type Predicate,
  type RecursivePartial,
  ScaleType,
  Settings,
  Tooltip,
  TooltipContainer,
  type CustomTooltip,
} from '@elastic/charts';
import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { deriveBucketInterval } from '../../../../common/entity_analytics/anomalies/derive_bucket_interval';
import { getAnomalyChartStyling } from '../recent_anomalies/anomaly_chart_styling';
import type { AnomalyBand } from '../recent_anomalies/anomaly_bands';
import {
  ENTITY_ANOMALIES_SWIMLANE_ANOMALY_COUNT,
  ENTITY_ANOMALIES_SWIMLANE_MAX_SCORE,
  ENTITY_ANOMALIES_SWIMLANE_X_AXIS_LABEL,
} from './translations';

const SWIMLANE_X_ACCESSOR_KEY = '@timestamp';
const SWIMLANE_Y_ACCESSOR_KEY = 'record_score';
const SWIMLANE_COUNT_ACCESSOR_KEY = 'count';

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

const dateLabelFormatter = new Intl.DateTimeFormat(i18n.getLocale(), {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const dateTimeLabelFormatter = new Intl.DateTimeFormat(i18n.getLocale(), {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

/** Formats x-axis ticks as "May 25, 2026". */
const formatDateTick = (value: string | number): string => {
  const ms = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(ms)) {
    return '';
  }
  return dateLabelFormatter.format(new Date(ms));
};

function getSeverityColor(score: number, bands: AnomalyBand[]): string | undefined {
  return bands.find((band) => score >= band.start && score < band.end)?.color;
}

function createSwimlaneTooltip(
  bucketIntervalMs: number,
  records: Array<Record<string, unknown>>,
  yAxisLabel: string,
  anomalyBands: AnomalyBand[]
): CustomTooltip<HeatmapCellDatum> {
  const SwimlaneTooltip: CustomTooltip<HeatmapCellDatum> = ({ values }) => {
    const { euiTheme } = useEuiTheme();
    const datum = values[0]?.datum;
    if (!datum) return null;

    const bucketStart = datum.x as number;
    const bucketEnd = bucketStart + bucketIntervalMs;
    const yValue = datum.y as string;
    const maxScore = datum.value;
    const count = (records[datum.originalIndex]?.[SWIMLANE_COUNT_ACCESSOR_KEY] as number) ?? 0;
    const severityColor = getSeverityColor(maxScore, anomalyBands);

    const timeRange = `${dateTimeLabelFormatter.format(
      bucketStart
    )} – ${dateTimeLabelFormatter.format(bucketEnd)}`;

    const rows = [
      { label: yAxisLabel, value: yValue },
      { label: ENTITY_ANOMALIES_SWIMLANE_ANOMALY_COUNT, value: String(count) },
      {
        label: ENTITY_ANOMALIES_SWIMLANE_MAX_SCORE,
        value: maxScore.toFixed(2),
        swatch: severityColor,
      },
    ];

    return (
      <TooltipContainer>
        <div style={{ minWidth: 240 }}>
          <div
            style={{
              fontWeight: euiTheme.font.weight.bold,
              padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
              borderBottom: euiTheme.border.thin,
            }}
          >
            {timeRange}
          </div>
          <div style={{ padding: `${euiTheme.size.xxs} 0` }}>
            {rows.map(({ label, value, swatch }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: euiTheme.size.l,
                  padding: `1px ${euiTheme.size.m}`,
                  position: 'relative',
                }}
              >
                {swatch && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 6,
                      borderRadius: 1,
                      backgroundColor: swatch,
                    }}
                  />
                )}
                <span>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </TooltipContainer>
    );
  };

  return SwimlaneTooltip;
}

interface AnomaliesSwimlaneProps {
  anomalyBands: AnomalyBand[];
  from: number;
  heatmapId: string;
  records: Array<Record<string, unknown>>;
  to: number;
  yAxisAccessor: string;
  yAxisLabel: string;
  yAxisNames: string[];
  ySortPredicate?: Predicate;
}

export const AnomaliesSwimlane: React.FC<AnomaliesSwimlaneProps> = ({
  anomalyBands,
  from,
  heatmapId,
  records,
  to,
  yAxisNames,
  yAxisAccessor,
  yAxisLabel,
  ySortPredicate = 'numDesc',
}) => {
  const xDomain = useMemo(() => ({ min: from, max: to }), [from, to]);
  const bucketInterval = useMemo(() => deriveBucketInterval(from, to), [from, to]);

  const swimlaneTooltip = useMemo(
    () => createSwimlaneTooltip(bucketInterval.ms, records, yAxisLabel, anomalyBands),
    [bucketInterval.ms, records, yAxisLabel, anomalyBands]
  );

  const chartBands = useMemo(
    () => anomalyBands.map(({ start, end, color }) => ({ start, end, color })),
    [anomalyBands]
  );

  const styling = getAnomalyChartStyling(true);
  const baseTheme = useElasticChartsTheme();

  return (
    <EuiFlexItem
      css={{
        height: `${styling.heightOfHeatmap(yAxisNames.length)}px`,
      }}
    >
      <Chart>
        <Tooltip customTooltip={swimlaneTooltip} />
        <Settings
          baseTheme={baseTheme}
          locale={i18n.getLocale()}
          theme={{ heatmap: heatmapComponentStyle }}
          xDomain={xDomain}
        />
        <Heatmap
          id={heatmapId}
          xScale={{
            type: ScaleType.Time,
            interval: { type: 'fixed', value: bucketInterval.value, unit: bucketInterval.unit },
          }}
          colorScale={{
            type: 'bands',
            bands: chartBands,
          }}
          data={records}
          name={ENTITY_ANOMALIES_SWIMLANE_MAX_SCORE}
          xAccessor={SWIMLANE_X_ACCESSOR_KEY}
          xAxisLabelName={ENTITY_ANOMALIES_SWIMLANE_X_AXIS_LABEL}
          xAxisLabelFormatter={formatDateTick}
          yAccessor={yAxisAccessor}
          yAxisLabelName={yAxisLabel}
          ySortPredicate={ySortPredicate}
          valueAccessor={SWIMLANE_Y_ACCESSOR_KEY}
        />
      </Chart>
    </EuiFlexItem>
  );
};
