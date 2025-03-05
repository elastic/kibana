/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_CLIENT_GEO_COUNTRY_NAME,
  ATTR_PROCESSOR_EVENT,
  ATTR_SERVICE_ENVIRONMENT,
  ATTR_SERVICE_NAME,
  ATTR_TIMESTAMP,
  ATTR_TRANSACTION_DURATION_US,
  ATTR_TRANSACTION_EXPERIENCE_CLS,
  ATTR_TRANSACTION_EXPERIENCE_FID,
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
  PROCESSOR_EVENT_VALUE_TRANSACTION,
} from '@kbn/observability-ui-semantic-conventions';
import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  LABEL_FIELDS_BREAKDOWN,
  LABEL_FIELDS_FILTER,
  OPERATION_COLUMN,
  RECORDS_FIELD,
  REPORT_METRIC_FIELD,
  PERCENTILE,
  ReportTypes,
} from '../constants';
import { buildPhraseFilter } from '../utils';
import {
  BACKEND_TIME_LABEL,
  CLS_LABEL,
  FCP_LABEL,
  FID_LABEL,
  LCP_LABEL,
  PAGE_LOAD_TIME_LABEL,
  PAGE_VIEWS_LABEL,
  TBT_LABEL,
  WEB_APPLICATION_LABEL,
} from '../constants/labels';

export function getKPITrendsLensConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'bar_stacked',
    seriesTypes: [],
    reportType: ReportTypes.KPI,
    xAxisColumn: {
      sourceField: ATTR_TIMESTAMP,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'median',
      },
    ],
    hasOperationType: false,
    filterFields: [
      ATTR_TRANSACTION_URL,
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
      PERCENTILE,
      LABEL_FIELDS_BREAKDOWN,
    ],
    baseFilters: [
      ...buildPhraseFilter(ATTR_TRANSACTION_TYPE, 'page-load', dataView),
      ...buildPhraseFilter(ATTR_PROCESSOR_EVENT, PROCESSOR_EVENT_VALUE_TRANSACTION, dataView),
    ],
    labels: { ...FieldLabels, [ATTR_SERVICE_NAME]: WEB_APPLICATION_LABEL },
    definitionFields: [ATTR_SERVICE_NAME, ATTR_SERVICE_ENVIRONMENT],
    metricOptions: [
      { field: RECORDS_FIELD, id: RECORDS_FIELD, label: PAGE_VIEWS_LABEL },
      {
        label: PAGE_LOAD_TIME_LABEL,
        field: ATTR_TRANSACTION_DURATION_US,
        id: ATTR_TRANSACTION_DURATION_US,
        columnType: OPERATION_COLUMN,
      },
      {
        label: BACKEND_TIME_LABEL,
        field: ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
        id: ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
        columnType: OPERATION_COLUMN,
      },
      {
        label: FCP_LABEL,
        field: ATTR_TRANSACTION_MARKS_AGENT_FIRST_CONTENTFUL_PAINT,
        id: ATTR_TRANSACTION_MARKS_AGENT_FIRST_CONTENTFUL_PAINT,
        columnType: OPERATION_COLUMN,
      },
      {
        label: TBT_LABEL,
        field: ATTR_TRANSACTION_EXPERIENCE_TBT,
        id: ATTR_TRANSACTION_EXPERIENCE_TBT,
        columnType: OPERATION_COLUMN,
      },
      {
        label: LCP_LABEL,
        field: ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT,
        id: ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT,
        columnType: OPERATION_COLUMN,
      },
      {
        label: FID_LABEL,
        field: ATTR_TRANSACTION_EXPERIENCE_FID,
        id: ATTR_TRANSACTION_EXPERIENCE_FID,
        columnType: OPERATION_COLUMN,
      },
      {
        label: CLS_LABEL,
        field: ATTR_TRANSACTION_EXPERIENCE_CLS,
        id: ATTR_TRANSACTION_EXPERIENCE_CLS,
        columnType: OPERATION_COLUMN,
      },
    ],
  };
}
