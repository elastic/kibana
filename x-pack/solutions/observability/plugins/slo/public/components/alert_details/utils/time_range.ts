/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util/src/get_padded_alert_time_range';
import type { DateRange } from '@kbn/alerting-plugin/common';
import {
  ALERT_END,
  ALERT_START,
  ALERT_TIME_RANGE,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { TimeRange } from '../../slo/error_rate_chart/use_lens_definition';
import type { BurnRateAlert } from '../types';
import { getActionGroupWindow } from './alert';

export function getChartTimeRange(alert: BurnRateAlert): TimeRange {
  const timeRange = getPaddedAlertTimeRange(alert.fields[ALERT_START]!, alert.fields[ALERT_END]);
  const actionGroupWindow = getActionGroupWindow(alert);
  const windowDurationInMs = actionGroupWindow.longWindow.value * 60 * 60 * 1000;
  return {
    from: new Date(new Date(timeRange.from).getTime() - windowDurationInMs),
    to: timeRange.to ? new Date(timeRange.to) : new Date(),
  };
}

export function getDataTimeRange(alert: BurnRateAlert): TimeRange {
  const timeRange = alert.fields[ALERT_TIME_RANGE] as DateRange;
  const actionGroupWindow = getActionGroupWindow(alert);
  const windowDurationInMs = actionGroupWindow.longWindow.value * 60 * 60 * 1000;
  return {
    from: new Date(new Date(timeRange.gte).getTime() - windowDurationInMs),
    to: timeRange.lte ? new Date(timeRange.lte) : new Date(),
  };
}
