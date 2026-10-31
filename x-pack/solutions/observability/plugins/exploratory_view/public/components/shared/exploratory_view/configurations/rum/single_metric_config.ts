/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels } from '../constants';
import { buildKueryFilter, RUM_PAGE_LOAD_KQL } from '../utils';

export function getSingleMetricConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'line',
    xAxisColumn: {},
    yAxisColumns: [
      {
        operationType: 'median',
      },
    ],
    breakdownFields: [],
    filterFields: [],
    seriesTypes: [],
    hasOperationType: true,
    definitionFields: ['service.name'],
    reportType: 'single-metric',
    baseFilters: [...buildKueryFilter(RUM_PAGE_LOAD_KQL, dataView)],
    metricOptions: [
      {
        id: 'page_views',
        field: 'Records',
        label: 'Total page views',
      },
      {
        id: 'page_load_time',
        field: 'transaction.duration.us',
        label: 'Page load time',
      },
      {
        id: 'backend_time',
        field: 'transaction.marks.agent.timeToFirstByte',
        label: 'Backend time',
      },
      {
        id: 'frontend_time',
        field: 'transaction.marks.agent.timeToFirstByte',
        label: 'Frontend time',
      },
    ],
    labels: FieldLabels,
  };
}
