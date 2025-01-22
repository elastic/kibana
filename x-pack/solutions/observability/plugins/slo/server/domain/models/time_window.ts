/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calendarAlignedTimeWindowSchema,
  rollingTimeWindowSchema,
  timeWindowSchema,
} from '@kbn/slo-schema';
import moment from 'moment';
import * as t from 'io-ts';

type TimeWindow = t.TypeOf<typeof timeWindowSchema>;
type RollingTimeWindow = t.TypeOf<typeof rollingTimeWindowSchema>;
type CalendarAlignedTimeWindow = t.TypeOf<typeof calendarAlignedTimeWindowSchema>;

export type { RollingTimeWindow, TimeWindow, CalendarAlignedTimeWindow };

export function toCalendarAlignedTimeWindowMomentUnit(
  timeWindow: CalendarAlignedTimeWindow
): moment.unitOfTime.StartOf {
  const unit = timeWindow.duration.unit;
  switch (unit) {
    case 'w':
      return 'isoWeeks';
    case 'M':
      return 'months';
    default:
      throw new Error(`Invalid calendar aligned time window duration unit: ${unit}`);
  }
}

export function toRollingTimeWindowMomentUnit(
  timeWindow: RollingTimeWindow
): moment.unitOfTime.Diff {
  const unit = timeWindow.duration.unit;
  switch (unit) {
    case 'd':
      return 'days';
    default:
      throw new Error(`Invalid rolling time window duration unit: ${unit}`);
  }
}
