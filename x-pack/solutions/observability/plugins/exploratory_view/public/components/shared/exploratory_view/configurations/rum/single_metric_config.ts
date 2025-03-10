/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_PROCESSOR_EVENT,
  ATTR_SERVICE_NAME,
  ATTR_TRANSACTION_DURATION_US,
  ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
  ATTR_TRANSACTION_TYPE,
  PROCESSOR_EVENT_VALUE_TRANSACTION,
  TRANSACTION_TYPE_VALUE_PAGE_LOAD,
} from '@kbn/observability-ui-semantic-conventions';
import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels } from '../constants';
import { buildPhraseFilter } from '../utils';

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
    definitionFields: [ATTR_SERVICE_NAME],
    reportType: 'single-metric',
    baseFilters: [
      ...buildPhraseFilter(ATTR_TRANSACTION_TYPE, TRANSACTION_TYPE_VALUE_PAGE_LOAD, dataView),
      ...buildPhraseFilter(ATTR_PROCESSOR_EVENT, PROCESSOR_EVENT_VALUE_TRANSACTION, dataView),
    ],
    metricOptions: [
      {
        id: 'page_views',
        field: 'Records',
        label: 'Total page views',
      },
      {
        id: 'page_load_time',
        field: ATTR_TRANSACTION_DURATION_US,
        label: 'Page load time',
      },
      {
        id: 'backend_time',
        field: ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
        label: 'Backend time',
      },
      {
        id: 'frontend_time',
        field: ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
        label: 'Frontend time',
      },
    ],
    labels: FieldLabels,
  };
}
