/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiPanel, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { RumTrendPoint } from '../../../../common/rum_app';
import { TrendChartTypeGroup, TrendMetric, useTrendChartType } from './trend_metric';
import { useRumTrends } from './use_rum_trends';

type TrendAccessor = Exclude<keyof RumTrendPoint, 'timestamp'>;

const LABELS: Record<TrendAccessor, string> = {
  sessions: i18n.translate('xpack.ux.overview.trendsSessions', { defaultMessage: 'Sessions' }),
  pageViews: i18n.translate('xpack.ux.overview.trendsViews', { defaultMessage: 'Page views' }),
  errors: i18n.translate('xpack.ux.overview.trendsErrors', { defaultMessage: 'Errors' }),
};

export function TabTrendChart({ accessor }: { accessor: TrendAccessor }) {
  const { euiTheme } = useEuiTheme();
  const { points, loading } = useRumTrends();
  const [chartType, setChartType] = useTrendChartType();
  const color =
    accessor === 'errors'
      ? euiTheme.colors.danger
      : accessor === 'pageViews'
      ? euiTheme.colors.vis.euiColorVis1
      : euiTheme.colors.vis.euiColorVis0;

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={`uxTabTrend-${accessor}`}>
      {loading && points.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
            width: '100%',
          }}
        >
          <EuiLoadingSpinner size="m" />
        </div>
      ) : (
        <TrendMetric
          id={accessor}
          label={LABELS[accessor]}
          points={points}
          accessor={accessor}
          color={color}
          invertDelta={accessor === 'errors'}
          chartType={chartType}
          headerExtra={<TrendChartTypeGroup chartType={chartType} onChange={setChartType} />}
        />
      )}
    </EuiPanel>
  );
}
