/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import type { LensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { useChartSeriesColor } from './use_chart_series_color';

const LOG_RATE = i18n.translate('xpack.infra.assetDetails.charts.logRate', {
  defaultMessage: 'Log Rate',
});

const LOG_ERROR_RATE = i18n.translate('xpack.infra.assetDetails.charts.logErrorRate', {
  defaultMessage: 'Log Error Rate',
});

const logRateMetric: LensConfig & { id: string } = {
  id: 'logMetric',
  chartType: 'metric',
  title: LOG_RATE,
  label: LOG_RATE,
  trendLine: true,
  value: 'count()',
  format: 'number',
  decimals: 1,
  normalizeByUnit: 's',
};

const logErrorRateMetric: LensConfig & { id: string } = {
  id: 'logErrorMetric',
  chartType: 'metric',
  title: LOG_ERROR_RATE,
  label: LOG_ERROR_RATE,
  trendLine: true,
  value:
    'count(kql=\'log.level: "error" OR log.level: "ERROR" OR error.log.level: "error" OR error.log.level: "ERROR"\')',
  format: 'number',
  decimals: 1,
  normalizeByUnit: 's',
};

export const useLogsCharts = ({
  dataViewId,
  seriesColor,
}: {
  dataViewId?: string;
  seriesColor?: string;
}) => {
  seriesColor = useChartSeriesColor(seriesColor);

  return useMemo(() => {
    const dataset = dataViewId && {
      dataset: {
        index: dataViewId,
      },
    };

    return {
      charts: [
        {
          ...logRateMetric,
          ...dataset,
          seriesColor,
        },
        {
          ...logErrorRateMetric,
          ...dataset,
          seriesColor,
        },
      ],
    };
  }, [dataViewId, seriesColor]);
};
