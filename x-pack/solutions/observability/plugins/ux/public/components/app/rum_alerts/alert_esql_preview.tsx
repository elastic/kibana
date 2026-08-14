/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  Axis,
  BarSeries,
  Chart,
  LineAnnotation,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import {
  EuiCallOut,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiStat,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import React, { useEffect, useMemo, useState } from 'react';
import { isPlaceholderRumAlertEsql } from '../../../../common/rum_alert_esql';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import {
  previewRumAlertEsql,
  type RumAlertPreviewResult,
} from '../../../services/rest/rum_alerts_api';

const NUMERIC_TYPES = new Set(['long', 'integer', 'double', 'float', 'unsigned_long', 'number']);

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function AlertEsqlPreview({
  query,
  lookback,
  threshold,
}: {
  query: string;
  lookback: string;
  threshold?: number;
}) {
  const { http } = useKibanaServices();
  const { euiTheme } = useEuiTheme();
  const { baseTheme, theme } = useChartThemes();
  const [preview, setPreview] = useState<RumAlertPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || isPlaceholderRumAlertEsql(query)) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void previewRumAlertEsql(http, { query, lookback })
        .then((result) => {
          if (!cancelled) {
            setPreview(result);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setPreview({
              columns: [],
              rows: [],
              wouldFire: false,
              chartQuery: query,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [http, lookback, query]);

  const chart = useMemo(() => {
    if (!preview || preview.rows.length === 0) {
      return null;
    }
    const numericIndex = preview.columns.findIndex(
      (column) =>
        NUMERIC_TYPES.has(column.type) && column.name !== 'samples' && column.name !== 'views'
    );
    const metricIndex =
      numericIndex >= 0
        ? numericIndex
        : preview.columns.findIndex((column) => NUMERIC_TYPES.has(column.type));
    if (metricIndex < 0) {
      return null;
    }
    const categoryIndex = preview.columns.findIndex(
      (column, index) => index !== metricIndex && !NUMERIC_TYPES.has(column.type)
    );
    const metricName = preview.columns[metricIndex].name;
    return {
      metricName,
      points: preview.rows.map((row, index) => ({
        x:
          categoryIndex >= 0
            ? String(
                row[categoryIndex] ??
                  i18n.translate('xpack.ux.alerts.preview.rowLabel', {
                    defaultMessage: 'Row {index}',
                    values: { index: index + 1 },
                  })
              )
            : i18n.translate('xpack.ux.alerts.preview.rowLabel', {
                defaultMessage: 'Row {index}',
                values: { index: index + 1 },
              }),
        y: toNumber(row[metricIndex]),
      })),
    };
  }, [preview]);

  if (isPlaceholderRumAlertEsql(query)) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.ux.alerts.preview.aiPendingDescription', {
          defaultMessage: 'Generate ES|QL to preview the condition against current RUM data.',
        })}
      </EuiText>
    );
  }

  return (
    <div data-test-subj="uxAlertEsqlPreview">
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.ux.alerts.preview.headingLabel', {
          defaultMessage: 'Preview (lookback {lookback})',
          values: { lookback },
        })}
      </EuiText>
      <EuiSpacer size="s" />
      {loading && !preview && <EuiLoadingSpinner size="m" />}
      {preview?.error && (
        <EuiCallOut
          announceOnMount
          color="danger"
          size="s"
          title={i18n.translate('xpack.ux.alerts.preview.errorTitle', {
            defaultMessage: 'Preview failed',
          })}
        >
          <p>{preview.error}</p>
        </EuiCallOut>
      )}
      {preview && !preview.error && (
        <>
          <EuiCallOut
            announceOnMount
            color={preview.wouldFire ? 'danger' : 'success'}
            size="s"
            title={
              preview.wouldFire
                ? i18n.translate('xpack.ux.alerts.preview.wouldFireTitle', {
                    defaultMessage: 'Would fire on current data',
                  })
                : i18n.translate('xpack.ux.alerts.preview.wouldNotFireTitle', {
                    defaultMessage: 'Would not fire on current data',
                  })
            }
          />
          <EuiSpacer size="s" />
          {chart && chart.points.length === 1 ? (
            <EuiStat
              title={String(chart.points[0].y)}
              titleSize="s"
              description={chart.metricName}
            />
          ) : chart ? (
            <div
              css={css`
                height: 160px;
                width: 100%;
              `}
            >
              <Chart size={{ height: 160, width: '100%' }}>
                <Settings
                  baseTheme={baseTheme}
                  theme={[
                    {
                      chartMargins: { left: 0, right: 8, top: 8, bottom: 0 },
                      background: { color: 'transparent' },
                    },
                    ...theme,
                  ]}
                  showLegend={false}
                  locale={i18n.getLocale()}
                />
                <Axis
                  id="ux-alert-preview-y"
                  position={Position.Left}
                  ticks={3}
                  style={{ tickLine: { visible: false }, axisLine: { visible: false } }}
                />
                <Axis
                  id="ux-alert-preview-x"
                  position={Position.Bottom}
                  ticks={4}
                  style={{ tickLine: { visible: false }, axisLine: { visible: false } }}
                />
                {threshold != null && threshold > 0 && (
                  <LineAnnotation
                    id="ux-alert-preview-threshold"
                    domainType={AnnotationDomainType.YDomain}
                    dataValues={[{ dataValue: threshold }]}
                    style={{
                      line: {
                        stroke: euiTheme.colors.danger,
                        strokeWidth: 1,
                        opacity: 0.8,
                        dash: [4, 4],
                      },
                    }}
                  />
                )}
                <BarSeries
                  id={chart.metricName}
                  name={chart.metricName}
                  xScaleType={ScaleType.Ordinal}
                  yScaleType={ScaleType.Linear}
                  xAccessor="x"
                  yAccessors={['y']}
                  data={chart.points}
                  color={euiTheme.colors.vis.euiColorVis0}
                />
              </Chart>
            </div>
          ) : (
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.ux.alerts.preview.emptyDescription', {
                defaultMessage: 'No rows in this lookback. Widen the range or lower the threshold.',
              })}
            </EuiText>
          )}
        </>
      )}
    </div>
  );
}
