/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CalendarAlignedTimeWindow,
  RollingTimeWindow,
  TimeWindow,
} from '../../domain/models/time_window';
import { ninetyDays, oneMonth, oneWeek, sevenDays, thirtyDays } from './duration';

export function sevenDaysRolling(): RollingTimeWindow {
  return {
    duration: sevenDays(),
    type: 'rolling',
  };
}
export function thirtyDaysRolling(): RollingTimeWindow {
  return {
    duration: thirtyDays(),
    type: 'rolling',
  };
}

export function ninetyDaysRolling(): TimeWindow {
  return {
    duration: ninetyDays(),
    type: 'rolling',
  };
}

export function weeklyCalendarAligned(): CalendarAlignedTimeWindow {
  return {
    duration: oneWeek(),
    type: 'calendarAligned',
  };
}

export function monthlyCalendarAligned(): CalendarAlignedTimeWindow {
  return {
    duration: oneMonth(),
    type: 'calendarAligned',
  };
}
