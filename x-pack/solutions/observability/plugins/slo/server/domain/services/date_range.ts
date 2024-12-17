/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calendarAlignedTimeWindowSchema, rollingTimeWindowSchema } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import moment from 'moment';
import { DateRange } from '../models';
import {
  TimeWindow,
  toCalendarAlignedTimeWindowMomentUnit,
  toRollingTimeWindowMomentUnit,
} from '../models/time_window';

export const toDateRange = (timeWindow: TimeWindow, currentDate: Date = new Date()): DateRange => {
  if (calendarAlignedTimeWindowSchema.is(timeWindow)) {
    const unit = toCalendarAlignedTimeWindowMomentUnit(timeWindow);
    const from = moment.utc(currentDate).startOf(unit);
    const to = moment.utc(currentDate).endOf(unit);

    return { from: from.toDate(), to: to.toDate() };
  }

  if (rollingTimeWindowSchema.is(timeWindow)) {
    const unit = toRollingTimeWindowMomentUnit(timeWindow);
    const now = moment.utc(currentDate).startOf('minute');
    const from = now.clone().subtract(timeWindow.duration.value, unit);
    const to = now.clone();

    return {
      from: from.toDate(),
      to: to.toDate(),
    };
  }

  assertNever(timeWindow);
};
