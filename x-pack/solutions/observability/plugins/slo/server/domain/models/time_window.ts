/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  calendarAlignedTimeWindowSchema,
  rollingTimeWindowSchema,
  timeWindowSchema,
} from '@kbn/slo-schema';
import type moment from 'moment';
import type { z } from '@kbn/zod';

type TimeWindow = z.output<typeof timeWindowSchema>;
type RollingTimeWindow = z.output<typeof rollingTimeWindowSchema>;
type CalendarAlignedTimeWindow = z.output<typeof calendarAlignedTimeWindowSchema>;

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
