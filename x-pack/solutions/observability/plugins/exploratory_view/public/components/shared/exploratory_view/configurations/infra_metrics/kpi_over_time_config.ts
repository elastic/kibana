/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_AGENT_HOSTNAME,
  ATTR_AGENT_TYPE,
  ATTR_SERVICE_TYPE,
  ATTR_TIMESTAMP,
  METRIC_DOCKER_CPU_TOTAL_PCT,
  METRIC_KUBERNETES_POD_CPU_USAGE_NODE_PCT,
  METRIC_SYSTEM_CPU_TOTAL_NORM_PCT,
  METRIC_SYSTEM_MEMORY_USED_PCT,
} from '@kbn/observability-ui-semantic-conventions';
import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, OPERATION_COLUMN, REPORT_METRIC_FIELD, ReportTypes } from '../constants';
import {
  DOCKER_CPU_USAGE,
  K8S_POD_CPU_USAGE,
  SYSTEM_CPU_USAGE,
  SYSTEM_MEMORY_USAGE,
} from '../constants/labels';

export function getMetricsKPIConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.KPI,
    defaultSeriesType: 'area',
    seriesTypes: [],
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
    filterFields: [ATTR_AGENT_TYPE, ATTR_SERVICE_TYPE],
    breakdownFields: [ATTR_AGENT_HOSTNAME, ATTR_SERVICE_TYPE],
    baseFilters: [],
    definitionFields: [ATTR_AGENT_HOSTNAME, ATTR_SERVICE_TYPE],
    metricOptions: [
      {
        label: SYSTEM_CPU_USAGE,
        field: METRIC_SYSTEM_CPU_TOTAL_NORM_PCT,
        id: METRIC_SYSTEM_CPU_TOTAL_NORM_PCT,
        columnType: OPERATION_COLUMN,
      },
      {
        label: SYSTEM_MEMORY_USAGE,
        field: METRIC_SYSTEM_MEMORY_USED_PCT,
        id: METRIC_SYSTEM_MEMORY_USED_PCT,
        columnType: OPERATION_COLUMN,
      },
      {
        label: DOCKER_CPU_USAGE,
        field: METRIC_DOCKER_CPU_TOTAL_PCT,
        id: METRIC_DOCKER_CPU_TOTAL_PCT,
        columnType: OPERATION_COLUMN,
      },
      {
        label: K8S_POD_CPU_USAGE,
        field: METRIC_KUBERNETES_POD_CPU_USAGE_NODE_PCT,
        id: METRIC_KUBERNETES_POD_CPU_USAGE_NODE_PCT,
        columnType: OPERATION_COLUMN,
      },
    ],
    labels: { ...FieldLabels },
  };
}
