/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { TimeRangeBounds } from '@kbn/data-plugin/common';
import { niceTimeFormatByDay, timeFormatter } from '@elastic/charts';
import { TickFormatter } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import { EMPTY_VALUE } from '../constants/common';

moment.suppressDeprecationWarnings = true;

export const FULL_DATE = 'MMMM Do YYYY @ HH:mm:ss';

/**
 * Converts a string or moment date to the 'MMMM Do YYYY @ HH:mm:ss' format.
 * @param date Date to be formatted
 * @param timeZone Timezone used to format the date
 * @param format Optional format used by moment to format the date
 * @returns The formatted string or {@link EMPTY_VALUE} if the input date wasn't valid
 */
export const dateFormatter = (
  date: string | moment.Moment,
  timeZone: string,
  format?: string
): string => {
  const momentDate: moment.Moment =
    typeof date === 'string' ? moment.tz(date, timeZone) : date.tz(timeZone);
  return momentDate.isValid() ? momentDate.format(format) : EMPTY_VALUE;
};

/**
 * Calculates the difference in days between two moment dates
 * @param minDate Min (older) date
 * @param maxDate Max (newer) date
 * @returns The number of days between the two input dates (returns 2 if the difference is less than 1 to play nice with the {@link niceTimeFormatByDay} function
 */
export const getDateDifferenceInDays = (minDate: moment.Moment, maxDate: moment.Moment): number => {
  const differenceInDays = maxDate.diff(minDate, 'days');

  if (differenceInDays <= 1 && !minDate.isSame(maxDate)) {
    return 2; // to return proper pattern from niceTimeFormatByDay
  }

  return differenceInDays;
};

/**
 * Nicely formats the label for a BartChart's time axis (uses {@link niceTimeFormatByDay} and {@link timeFormatter}from the '@elastic/charts' library)
 * @param dateRange Min and max values for the time axis ({@link TimeRangeBounds})
 * @returns A function ({@link timeFormatter} from the '@elastic/charts' library) that returns a formatted label as a string
 */
export const barChartTimeAxisLabelFormatter = (dateRange: TimeRangeBounds): TickFormatter => {
  const diff = getDateDifferenceInDays(
    dateRange.min as moment.Moment,
    dateRange.max as moment.Moment
  );
  const format = niceTimeFormatByDay(diff);
  return timeFormatter(format);
};
