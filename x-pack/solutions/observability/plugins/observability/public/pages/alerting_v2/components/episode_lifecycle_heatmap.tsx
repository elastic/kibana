/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { HeatmapStyle, RecursivePartial } from '@elastic/charts';
import { Chart, Heatmap, Predicate, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { EuiEmptyPrompt, EuiPanel, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { useKibana } from '../../../utils/kibana_react';

/** Short strip: one heatmap row + compact x-axis labels. */
const CHART_HEIGHT = 40;

const STATUS_VALUE: Record<AlertEpisodeStatus, number> = {
  [ALERT_EPISODE_STATUS.PENDING]: 0,
  [ALERT_EPISODE_STATUS.ACTIVE]: 1,
  [ALERT_EPISODE_STATUS.RECOVERING]: 2,
  [ALERT_EPISODE_STATUS.INACTIVE]: 3,
};

interface EpisodeStatusColorBand {
  start: AlertEpisodeStatus;
  end: AlertEpisodeStatus;
}

const EPISODE_STATUS_COLOR_BANDS: readonly EpisodeStatusColorBand[] = [
  { start: ALERT_EPISODE_STATUS.PENDING, end: ALERT_EPISODE_STATUS.PENDING },
  { start: ALERT_EPISODE_STATUS.ACTIVE, end: ALERT_EPISODE_STATUS.ACTIVE },
  { start: ALERT_EPISODE_STATUS.RECOVERING, end: ALERT_EPISODE_STATUS.RECOVERING },
  { start: ALERT_EPISODE_STATUS.INACTIVE, end: ALERT_EPISODE_STATUS.INACTIVE },
];

function toChartsNumericColorBands(
  bands: readonly EpisodeStatusColorBand[],
  colorForStatus: (status: AlertEpisodeStatus) => string
): Array<{ start: number; end: number; color: string; label: string }> {
  return bands.map((band, index) => {
    const status = band.start;
    const n = STATUS_VALUE[status];
    const isLast = index === bands.length - 1;
    return {
      start: n,
      end: isLast ? Infinity : n + 1,
      color: colorForStatus(status),
      label: statusLabel(status),
    };
  });
}

function statusFromHeatmapValue(value: number): AlertEpisodeStatus {
  const rounded = Math.round(value);
  if (rounded === 0) return ALERT_EPISODE_STATUS.PENDING;
  if (rounded === 1) return ALERT_EPISODE_STATUS.ACTIVE;
  if (rounded === 2) return ALERT_EPISODE_STATUS.RECOVERING;
  return ALERT_EPISODE_STATUS.INACTIVE;
}

function statusLabel(status: AlertEpisodeStatus): string {
  switch (status) {
    case ALERT_EPISODE_STATUS.PENDING:
      return i18n.translate('xpack.observability.pendingStatusBadgeLabel', {
        defaultMessage: 'Pending',
      });
    case ALERT_EPISODE_STATUS.ACTIVE:
      return i18n.translate('xpack.observability.activeStatusBadgeLabel', {
        defaultMessage: 'Active',
      });
    case ALERT_EPISODE_STATUS.RECOVERING:
      return i18n.translate('xpack.observability.recoveringStatusBadgeLabel', {
        defaultMessage: 'Recovering',
      });
    case ALERT_EPISODE_STATUS.INACTIVE:
      return i18n.translate('xpack.observability.inactiveStatusBadgeLabel', {
        defaultMessage: 'Inactive',
      });
    default:
      return i18n.translate('xpack.observability.unknownStatusBadgeLabel', {
        defaultMessage: 'Unknown',
      });
  }
}

function formatTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
}

function compactAxisTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Single horizontal strip; status is encoded in `value`. */
const LIFECYCLE_Y = 'Lifecycle';

interface HeatmapDatum {
  /** Column index after chronological sort — one cell per event. */
  x: number;
  y: string;
  value: number;
  ts: string;
  status: AlertEpisodeStatus;
}

interface HeatmapTableDatum {
  x: string | number;
  y: string | number;
  value: number;
  originalIndex: number;
}

export interface EpisodeLifecycleHeatmapProps {
  eventRows: Record<string, unknown>[];
}

export function EpisodeLifecycleHeatmap({ eventRows }: EpisodeLifecycleHeatmapProps) {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana();
  const baseTheme = services.charts.theme.useChartsBaseTheme();

  const data: HeatmapDatum[] = useMemo(() => {
    const rows = eventRows.map((row, rowIndex) => {
      const status = row['episode.status'] as AlertEpisodeStatus;
      const ts = typeof row['@timestamp'] === 'string' ? row['@timestamp'] : '';
      const tsMs = ts ? Date.parse(ts) : Number.NaN;
      return {
        ts,
        tsMs: Number.isFinite(tsMs) ? tsMs : Number.POSITIVE_INFINITY,
        y: LIFECYCLE_Y,
        value: STATUS_VALUE[status],
        status,
        rowIndex,
      };
    });

    rows.sort((a, b) => {
      if (a.tsMs !== b.tsMs) return a.tsMs - b.tsMs;
      return a.rowIndex - b.rowIndex;
    });

    return rows.map((row, index) => ({
      x: index,
      y: row.y,
      value: row.value,
      ts: row.ts,
      status: row.status,
    }));
  }, [eventRows]);

  const eventCount = data.length;

  const formatXAxisLabel = useCallback(
    (x: string | number) => {
      const col = typeof x === 'number' ? x : Number(x);
      if (!Number.isFinite(col) || eventCount === 0) return '';
      if (eventCount === 1) {
        const ts = data[0]?.ts;
        return ts && ts.length > 0 ? compactAxisTime(ts) : '';
      }
      if (col !== 0 && col !== eventCount - 1) {
        return '';
      }
      const ts = col === 0 ? data[0]?.ts : data[eventCount - 1]?.ts;
      return ts && ts.length > 0 ? compactAxisTime(ts) : '';
    },
    [data, eventCount]
  );

  const heatmapTheme: RecursivePartial<HeatmapStyle> = useMemo(
    () => ({
      grid: { stroke: { width: 0 } },
      cell: {
        maxWidth: 'fill',
        maxHeight: 14,
        label: { visible: false },
        border: { strokeWidth: 1, stroke: euiTheme.colors.emptyShade },
      },
      yAxisLabel: { visible: false },
      xAxisLabel: {
        visible: true,
        fontSize: 10,
        rotation: 0,
        padding: { top: 2, bottom: 0, left: 0, right: 0 },
      },
    }),
    [euiTheme]
  );

  const colorBands = useMemo(
    () =>
      toChartsNumericColorBands(EPISODE_STATUS_COLOR_BANDS, (status) => {
        switch (status) {
          case ALERT_EPISODE_STATUS.PENDING:
            return euiTheme.colors.warning;
          case ALERT_EPISODE_STATUS.ACTIVE:
            return euiTheme.colors.danger;
          case ALERT_EPISODE_STATUS.RECOVERING:
            return euiTheme.colors.primary;
          case ALERT_EPISODE_STATUS.INACTIVE:
            return euiTheme.colors.success;
          default:
            return euiTheme.colors.lightShade;
        }
      }),
    [euiTheme]
  );

  if (data.length === 0) {
    return (
      <EuiPanel
        hasBorder
        paddingSize="m"
        data-test-subj="observabilityEpisodeLifecycleHeatmapEmpty"
      >
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.observability.episodeDetails.lifecycleEmptyTitle', {
                defaultMessage: 'No events in this episode yet',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.observability.episodeDetails.lifecycleEmptyBody', {
                defaultMessage: 'Status changes across the episode lifecycle will appear here.',
              })}
            </p>
          }
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="observabilityEpisodeLifecycleHeatmap">
      <EuiTitle size="xxs">
        <h2>
          {i18n.translate('xpack.observability.episodeDetails.lifecycleTitle', {
            defaultMessage: 'Episode timeline',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <Chart size={{ height: CHART_HEIGHT }}>
        <Tooltip
          body={({ items: values }) => {
            const tableDatum = values?.[0]?.datum as HeatmapTableDatum | undefined;
            if (tableDatum == null) {
              return null;
            }
            const status = statusFromHeatmapValue(tableDatum.value);
            const original = data[tableDatum.originalIndex];
            const timeLabel =
              original?.ts && original.ts.length > 0 ? formatTimestamp(original.ts) : '';
            return (
              <div
                css={css`
                  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
                `}
              >
                <EuiText size="xs">
                  <strong>{statusLabel(status)}</strong>
                  {timeLabel.length > 0 && (
                    <>
                      <br />
                      {timeLabel}
                    </>
                  )}
                </EuiText>
              </div>
            );
          }}
        />
        <Settings
          showLegend={false}
          theme={{ heatmap: heatmapTheme }}
          baseTheme={baseTheme}
          locale={i18n.getLocale()}
        />
        <Heatmap
          id="episode-lifecycle-heatmap"
          colorScale={{ type: 'bands', bands: colorBands }}
          data={data}
          xAccessor="x"
          yAccessor="y"
          valueAccessor="value"
          xScale={{ type: ScaleType.Ordinal }}
          xSortPredicate={Predicate.NumAsc}
          xAxisLabelFormatter={formatXAxisLabel}
          xAxisLabelName=""
          yAxisLabelName=""
        />
      </Chart>
    </EuiPanel>
  );
}
