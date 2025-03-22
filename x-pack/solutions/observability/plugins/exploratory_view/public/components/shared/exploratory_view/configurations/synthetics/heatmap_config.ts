/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_OBSERVER_GEO_NAME,
  ATTR_TAGS,
  ATTR_TIMESTAMP,
  ATTR_URL_FULL,
} from '@kbn/observability-ui-semantic-conventions';
import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, RECORDS_FIELD, REPORT_METRIC_FIELD, ReportTypes } from '../constants';
import { DOWN_LABEL, UP_LABEL } from '../constants/labels';
import { SYNTHETICS_STEP_NAME } from '../constants/field_names/synthetics';
import { buildExistsFilter } from '../utils';

const SUMMARY_UP = 'summary.up';
const SUMMARY_DOWN = 'summary.down';

export function getSyntheticsHeatmapConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.HEATMAP,
    defaultSeriesType: 'bar_stacked',
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
    filterFields: [ATTR_OBSERVER_GEO_NAME, 'monitor.type', ATTR_TAGS, ATTR_URL_FULL],
    breakdownFields: [ATTR_OBSERVER_GEO_NAME, 'monitor.type', 'monitor.name', SYNTHETICS_STEP_NAME],
    baseFilters: [],
    definitionFields: [
      { field: 'monitor.name' },
      { field: ATTR_URL_FULL, filters: buildExistsFilter('summary.up', dataView) },
    ],
    metricOptions: [
      {
        label: 'Failed tests',
        id: 'failed_tests',
        columnFilter: { language: 'kuery', query: 'summary.down > 0' },
        format: 'number',
        field: RECORDS_FIELD,
      },
    ],
    labels: { ...FieldLabels, [SUMMARY_UP]: UP_LABEL, [SUMMARY_DOWN]: DOWN_LABEL },
  };
}
