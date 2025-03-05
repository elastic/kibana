/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_CLIENT_GEO_COUNTRY_NAME,
  ATTR_NUMERIC_LABELS_INP_VALUE,
  ATTR_PROCESSOR_EVENT,
  ATTR_SERVICE_ENVIRONMENT,
  ATTR_SERVICE_NAME,
  ATTR_TRANSACTION_DURATION_US,
  ATTR_TRANSACTION_EXPERIENCE_CLS,
  ATTR_TRANSACTION_EXPERIENCE_TBT,
  ATTR_TRANSACTION_MARKS_AGENT_FIRST_CONTENTFUL_PAINT,
  ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT,
  ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
  ATTR_TRANSACTION_TYPE,
  ATTR_TRANSACTION_URL,
  ATTR_USER_AGENT_DEVICE_NAME,
  ATTR_USER_AGENT_NAME,
  ATTR_USER_AGENT_OS_NAME,
  ATTR_USER_AGENT_VERSION,
} from '@kbn/observability-ui-semantic-conventions';
import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  REPORT_METRIC_FIELD,
  RECORDS_PERCENTAGE_FIELD,
  ReportTypes,
  LABEL_FIELDS_FILTER,
} from '../constants';
import { buildPhraseFilter } from '../utils';
import {
  BACKEND_TIME_LABEL,
  CLS_LABEL,
  FCP_LABEL,
  INP_LABEL,
  LCP_LABEL,
  PAGE_LOAD_TIME_LABEL,
  PAGES_LOADED_LABEL,
  TBT_LABEL,
  WEB_APPLICATION_LABEL,
} from '../constants/labels';

export function getRumDistributionConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.DISTRIBUTION,
    defaultSeriesType: 'line',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: REPORT_METRIC_FIELD,
    },
    yAxisColumns: [
      {
        sourceField: RECORDS_PERCENTAGE_FIELD,
        label: PAGES_LOADED_LABEL,
      },
    ],
    hasOperationType: false,
    filterFields: [
      {
        field: ATTR_TRANSACTION_URL,
        isNegated: false,
      },
      ATTR_USER_AGENT_OS_NAME,
      ATTR_CLIENT_GEO_COUNTRY_NAME,
      ATTR_USER_AGENT_DEVICE_NAME,
      {
        field: ATTR_USER_AGENT_NAME,
        nested: ATTR_USER_AGENT_VERSION,
      },
      LABEL_FIELDS_FILTER,
    ],
    breakdownFields: [
      ATTR_USER_AGENT_NAME,
      ATTR_USER_AGENT_OS_NAME,
      ATTR_CLIENT_GEO_COUNTRY_NAME,
      ATTR_USER_AGENT_DEVICE_NAME,
      ATTR_SERVICE_NAME,
    ],
    definitionFields: [ATTR_SERVICE_NAME, ATTR_SERVICE_ENVIRONMENT],
    metricOptions: [
      {
        label: PAGE_LOAD_TIME_LABEL,
        id: ATTR_TRANSACTION_DURATION_US,
        field: ATTR_TRANSACTION_DURATION_US,
        showPercentileAnnotations: true,
      },
      {
        label: BACKEND_TIME_LABEL,
        id: ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
        field: ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
      },
      {
        label: FCP_LABEL,
        id: ATTR_TRANSACTION_MARKS_AGENT_FIRST_CONTENTFUL_PAINT,
        field: ATTR_TRANSACTION_MARKS_AGENT_FIRST_CONTENTFUL_PAINT,
      },
      {
        label: TBT_LABEL,
        id: ATTR_TRANSACTION_EXPERIENCE_TBT,
        field: ATTR_TRANSACTION_EXPERIENCE_TBT,
      },
      {
        label: LCP_LABEL,
        id: ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT,
        field: ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT,
      },
      { label: INP_LABEL, id: ATTR_NUMERIC_LABELS_INP_VALUE, field: ATTR_NUMERIC_LABELS_INP_VALUE },
      {
        label: CLS_LABEL,
        id: ATTR_TRANSACTION_EXPERIENCE_CLS,
        field: ATTR_TRANSACTION_EXPERIENCE_CLS,
      },
    ],
    baseFilters: [
      ...buildPhraseFilter(ATTR_TRANSACTION_TYPE, 'page-load', dataView),
      ...buildPhraseFilter(ATTR_PROCESSOR_EVENT, 'transaction', dataView),
    ],
    labels: {
      ...FieldLabels,
      [ATTR_SERVICE_NAME]: WEB_APPLICATION_LABEL,
      [ATTR_TRANSACTION_DURATION_US]: PAGE_LOAD_TIME_LABEL,
    },
    // rum page load transactions are always less then 60 seconds
    query: { query: `${ATTR_TRANSACTION_DURATION_US} < 60000000`, language: 'kuery' },
  };
}
