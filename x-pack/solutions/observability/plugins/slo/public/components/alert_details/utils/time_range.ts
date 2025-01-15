/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DateRange } from '@kbn/alerting-plugin/common';
import { ALERT_TIME_RANGE } from '@kbn/rule-data-utils';
import { TimeRange } from '../../slo/error_rate_chart/use_lens_definition';
import { BurnRateAlert } from '../types';
import { getActionGroupWindow } from './alert';

export function getDataTimeRange(alert: BurnRateAlert): TimeRange {
  const timeRange = alert.fields[ALERT_TIME_RANGE] as DateRange;
  const actionGroupWindow = getActionGroupWindow(alert);
  const windowDurationInMs = actionGroupWindow.longWindow.value * 60 * 60 * 1000;
  return {
    from: new Date(new Date(timeRange.gte).getTime() - windowDurationInMs),
    to: timeRange.lte ? new Date(timeRange.lte) : new Date(),
  };
}
