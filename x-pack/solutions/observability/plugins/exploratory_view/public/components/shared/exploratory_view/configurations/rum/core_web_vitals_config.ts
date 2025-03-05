/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteForStatus } from '@elastic/eui';
import {
  ATTR_CLIENT_GEO_COUNTRY_NAME,
  ATTR_NUMERIC_LABELS_INP_VALUE,
  ATTR_PROCESSOR_EVENT,
  ATTR_SERVICE_ENVIRONMENT,
  ATTR_SERVICE_NAME,
  ATTR_TRANSACTION_EXPERIENCE_CLS,
  ATTR_TRANSACTION_EXPERIENCE_FID,
  ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT,
  ATTR_TRANSACTION_TYPE,
  ATTR_TRANSACTION_URL,
  ATTR_URL_FULL,
  ATTR_USER_AGENT_DEVICE_NAME,
  ATTR_USER_AGENT_NAME,
  ATTR_USER_AGENT_OS_NAME,
  ATTR_USER_AGENT_OS_VERSION,
  ATTR_USER_AGENT_VERSION,
} from '@kbn/observability-ui-semantic-conventions';
import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  FILTER_RECORDS,
  LABEL_FIELDS_FILTER,
  REPORT_METRIC_FIELD,
  ReportTypes,
  USE_BREAK_DOWN_COLUMN,
} from '../constants';
import { buildPhraseFilter, buildPhrasesFilter } from '../utils';
import { CLS_LABEL, FID_LABEL, INP_LABEL, LCP_LABEL } from '../constants/labels';

export function getCoreWebVitalsConfig({ dataView }: ConfigProps): SeriesConfig {
  const statusPallete = euiPaletteForStatus(3);

  return {
    defaultSeriesType: 'bar_horizontal_percentage_stacked',
    reportType: ReportTypes.CORE_WEB_VITAL,
    seriesTypes: ['bar_horizontal_percentage_stacked'],
    xAxisColumn: {
      sourceField: USE_BREAK_DOWN_COLUMN,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        label: 'Good',
      },
      {
        sourceField: REPORT_METRIC_FIELD,
        label: 'Average',
      },
      {
        sourceField: REPORT_METRIC_FIELD,
        label: 'Poor',
      },
    ],
    hasOperationType: false,
    filterFields: [
      {
        field: ATTR_TRANSACTION_URL,
        isNegated: false,
      },
      ATTR_SERVICE_NAME,
      {
        field: ATTR_USER_AGENT_OS_NAME,
        nested: ATTR_USER_AGENT_OS_VERSION,
      },
      ATTR_CLIENT_GEO_COUNTRY_NAME,
      ATTR_USER_AGENT_DEVICE_NAME,
      {
        field: ATTR_USER_AGENT_NAME,
        nested: ATTR_USER_AGENT_VERSION,
      },
      LABEL_FIELDS_FILTER,
    ],
    breakdownFields: [
      ATTR_SERVICE_NAME,
      ATTR_USER_AGENT_NAME,
      ATTR_USER_AGENT_OS_NAME,
      ATTR_CLIENT_GEO_COUNTRY_NAME,
      ATTR_USER_AGENT_DEVICE_NAME,
      ATTR_URL_FULL,
    ],
    baseFilters: [
      ...buildPhrasesFilter(ATTR_TRANSACTION_TYPE, ['page-load', 'page-exit'], dataView),
      ...buildPhraseFilter(ATTR_PROCESSOR_EVENT, 'transaction', dataView),
    ],
    labels: { ...FieldLabels, [ATTR_SERVICE_NAME]: 'Web Application' },
    definitionFields: [ATTR_SERVICE_NAME, ATTR_SERVICE_ENVIRONMENT],
    metricOptions: [
      {
        id: ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT,
        label: LCP_LABEL,
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `${ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT} < 2500`,
          },
          {
            language: 'kuery',
            query: `${ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT} > 2500 and ${ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT} < 4000`,
          },
          {
            language: 'kuery',
            query: `${ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT} > 4000`,
          },
        ],
      },
      {
        label: INP_LABEL,
        id: ATTR_NUMERIC_LABELS_INP_VALUE,
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `${ATTR_NUMERIC_LABELS_INP_VALUE} < 200`,
          },
          {
            language: 'kuery',
            query: `${ATTR_NUMERIC_LABELS_INP_VALUE} > 200 and ${ATTR_NUMERIC_LABELS_INP_VALUE} < 500`,
          },
          {
            language: 'kuery',
            query: `${ATTR_NUMERIC_LABELS_INP_VALUE} > 500`,
          },
        ],
      },
      {
        label: CLS_LABEL,
        id: ATTR_TRANSACTION_EXPERIENCE_CLS,
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `${ATTR_TRANSACTION_EXPERIENCE_CLS} < 0.1`,
          },
          {
            language: 'kuery',
            query: `${ATTR_TRANSACTION_EXPERIENCE_CLS} > 0.1 and ${ATTR_TRANSACTION_EXPERIENCE_CLS} < 0.25`,
          },
          {
            language: 'kuery',
            query: `${ATTR_TRANSACTION_EXPERIENCE_CLS} > 0.25`,
          },
        ],
      },
      {
        label: FID_LABEL,
        id: ATTR_TRANSACTION_EXPERIENCE_FID,
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `${ATTR_TRANSACTION_EXPERIENCE_FID} < 100`,
          },
          {
            language: 'kuery',
            query: `${ATTR_TRANSACTION_EXPERIENCE_FID} > 100 and ${ATTR_TRANSACTION_EXPERIENCE_FID} < 300`,
          },
          {
            language: 'kuery',
            query: `${ATTR_TRANSACTION_EXPERIENCE_FID} > 300`,
          },
        ],
      },
    ],
    yConfig: [
      { color: statusPallete[0], forAccessor: 'y-axis-column' },
      { color: statusPallete[1], forAccessor: 'y-axis-column-1' },
      { color: statusPallete[2], forAccessor: 'y-axis-column-2' },
    ],
    query: { query: `${ATTR_TRANSACTION_TYPE}: ("page-load" or "page-exit")`, language: 'kuery' },
  };
}
