/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, RECORDS_FIELD, ReportTypes } from '../constants';

export function getAlertsSingleMetricConfig({ spaceId }: ConfigProps): SeriesConfig {
  return {
    seriesTypes: [],
    defaultSeriesType: 'line',
    reportType: ReportTypes.SINGLE_METRIC,
    xAxisColumn: {},
    yAxisColumns: [
      {
        operationType: 'median',
      },
    ],
    hasOperationType: false,
    filterFields: ['kibana.alert.rule.name', 'kibana.alert.status'],
    breakdownFields: ['kibana.alert.rule.category', 'kibana.alert.status'],
    baseFilters: [],
    definitionFields: ['kibana.alert.rule.category'],
    metricOptions: [
      {
        label: 'Active',
        field: RECORDS_FIELD,
        id: 'Alerts',
        columnType: 'unique_count',
        metricStateOptions: {
          titlePosition: 'bottom',
        },
        emptyAsNull: false,
      },
    ],
    labels: { ...FieldLabels },
    query: {
      language: 'kuery',
      query: `kibana.space_ids: "${spaceId}"`,
    },
  };
}
