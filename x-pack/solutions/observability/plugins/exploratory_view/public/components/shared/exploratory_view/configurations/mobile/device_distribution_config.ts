/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_AGENT_NAME,
  ATTR_PROCESSOR_EVENT,
  ATTR_SERVICE_NAME,
  PROCESSOR_EVENT_VALUE_TRANSACTION,
} from '@kbn/observability-ui-semantic-conventions';
import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  LABEL_FIELDS_FILTER,
  REPORT_METRIC_FIELD,
  ReportTypes,
  USE_BREAK_DOWN_COLUMN,
} from '../constants';
import { buildPhraseFilter } from '../utils';
import { MOBILE_APP, NUMBER_OF_DEVICES } from '../constants/labels';
import { MobileFields } from './mobile_fields';

export function getMobileDeviceDistributionConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.DEVICE_DISTRIBUTION,
    defaultSeriesType: 'bar',
    seriesTypes: ['bar', 'bar_horizontal'],
    xAxisColumn: {
      sourceField: USE_BREAK_DOWN_COLUMN,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'unique_count',
      },
    ],
    hasOperationType: false,
    filterFields: [...Object.keys(MobileFields), LABEL_FIELDS_FILTER],
    breakdownFields: Object.keys(MobileFields),
    baseFilters: [
      ...buildPhraseFilter(ATTR_AGENT_NAME, 'iOS/swift', dataView),
      ...buildPhraseFilter(ATTR_PROCESSOR_EVENT, PROCESSOR_EVENT_VALUE_TRANSACTION, dataView),
    ],
    labels: {
      ...FieldLabels,
      ...MobileFields,
      [ATTR_SERVICE_NAME]: MOBILE_APP,
    },
    definitionFields: [ATTR_SERVICE_NAME],
    metricOptions: [
      {
        field: 'labels.device_id',
        id: 'labels.device_id',
        label: NUMBER_OF_DEVICES,
      },
    ],
  };
}
