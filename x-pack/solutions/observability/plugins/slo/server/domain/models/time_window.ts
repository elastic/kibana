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
import type * as t from 'io-ts';
import { Duration, toDurationUnit } from '@kbn/slo-schema';

type TimeWindow = t.TypeOf<typeof timeWindowSchema>;
type RollingTimeWindow = t.TypeOf<typeof rollingTimeWindowSchema>;
type CalendarAlignedTimeWindow = t.TypeOf<typeof calendarAlignedTimeWindowSchema>;

export type { RollingTimeWindow, TimeWindow, CalendarAlignedTimeWindow };

/**
 * Converts a composite SLO time window (string-based duration) into the
 * rich rolling time window shape used by the shared summary/historical services.
 */
export function toRichRollingTimeWindow(tw: {
  duration: string;
  type: 'rolling';
}): RollingTimeWindow {
  const value = parseInt(tw.duration.slice(0, -1), 10);
  const unit = toDurationUnit(tw.duration.slice(-1));
  return { duration: new Duration(value, unit), type: 'rolling' as const };
}

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
