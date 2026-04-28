/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import datemath from '@elastic/datemath';

export const getFormattedDate = ({
  date,
  dateFormat,
}: {
  date: string | null | undefined;
  dateFormat: string;
}): string | null => {
  if (date == null) {
    return null;
  }

  if (date === 'now') {
    return date;
  }

  // strictly parse the date, which will fail for dates like formatted like 'now':
  const strictParsed = moment(date, moment.ISO_8601, true);

  if (strictParsed.isValid()) {
    // return the formatted date per the time zone:
    return strictParsed.format(dateFormat);
  }

  const datemathParsed = datemath.parse(date);
  if (datemathParsed != null && datemathParsed.isValid()) {
    return datemathParsed.format(dateFormat);
  }

  return date; // return the original date if it cannot be parsed
};
