/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_AGENT_NAME,
  ATTR_PROCESSOR_EVENT,
  ATTR_SERVICE_ENVIRONMENT,
  ATTR_SERVICE_NAME,
  ATTR_TIMESTAMP,
  ATTR_TRANSACTION_DURATION_US,
  METRIC_SYSTEM_CPU_USAGE,
  METRIC_SYSTEM_MEMORY_USAGE,
  PROCESSOR_EVENT_VALUE_METRIC,
  PROCESSOR_EVENT_VALUE_TRANSACTION,
} from '@kbn/observability-ui-semantic-conventions';
import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  LABEL_FIELDS_FILTER,
  OPERATION_COLUMN,
  RECORDS_FIELD,
  REPORT_METRIC_FIELD,
  ReportTypes,
} from '../constants';
import { buildPhrasesFilter } from '../utils';
import {
  CPU_USAGE,
  SYSTEM_MEMORY_USAGE,
  MOBILE_APP,
  RESPONSE_LATENCY,
  TRANSACTIONS_PER_MINUTE,
} from '../constants/labels';
import { MobileFields } from './mobile_fields';

export function getMobileKPIConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.KPI,
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar', 'area'],
    xAxisColumn: {
      sourceField: ATTR_TIMESTAMP,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'median',
      },
    ],
    hasOperationType: true,
    filterFields: [...Object.keys(MobileFields), LABEL_FIELDS_FILTER],
    breakdownFields: Object.keys(MobileFields),
    baseFilters: [
      ...buildPhrasesFilter(ATTR_AGENT_NAME, ['iOS/swift', 'open-telemetry/swift'], dataView),
    ],
    labels: {
      ...FieldLabels,
      ...MobileFields,
      [ATTR_TRANSACTION_DURATION_US]: RESPONSE_LATENCY,
      [ATTR_SERVICE_NAME]: MOBILE_APP,
      [METRIC_SYSTEM_MEMORY_USAGE]: SYSTEM_MEMORY_USAGE,
      [METRIC_SYSTEM_CPU_USAGE]: CPU_USAGE,
    },
    definitionFields: [ATTR_SERVICE_NAME, ATTR_SERVICE_ENVIRONMENT],
    metricOptions: [
      {
        label: RESPONSE_LATENCY,
        field: ATTR_TRANSACTION_DURATION_US,
        id: ATTR_TRANSACTION_DURATION_US,
        columnType: OPERATION_COLUMN,
      },
      {
        field: RECORDS_FIELD,
        id: RECORDS_FIELD,
        label: TRANSACTIONS_PER_MINUTE,
        columnFilters: [
          {
            language: 'kuery',
            query: `${ATTR_PROCESSOR_EVENT}: ${PROCESSOR_EVENT_VALUE_TRANSACTION}`,
          },
        ],
        timeScale: 'm',
      },
      {
        label: SYSTEM_MEMORY_USAGE,
        field: METRIC_SYSTEM_MEMORY_USAGE,
        id: METRIC_SYSTEM_MEMORY_USAGE,
        columnType: OPERATION_COLUMN,
        columnFilters: [
          {
            language: 'kuery',
            query: `${ATTR_PROCESSOR_EVENT}: ${PROCESSOR_EVENT_VALUE_METRIC}`,
          },
        ],
      },
      {
        label: CPU_USAGE,
        field: METRIC_SYSTEM_CPU_USAGE,
        id: METRIC_SYSTEM_CPU_USAGE,
        columnType: OPERATION_COLUMN,
        columnFilters: [
          {
            language: 'kuery',
            query: `${ATTR_PROCESSOR_EVENT}: ${PROCESSOR_EVENT_VALUE_METRIC}`,
          },
        ],
      },
    ],
  };
}
