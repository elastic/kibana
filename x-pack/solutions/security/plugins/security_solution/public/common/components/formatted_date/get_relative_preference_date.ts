/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getMaybeDate } from './maybe_date';

export interface RelativePreferenceDate {
  date: Date;
  /** True when the date is older than the relative threshold and should use the user date format. */
  displayPreferenceTime: boolean;
}

/**
 * Parses a date and chooses relative vs preference formatting. Returns undefined when the value is missing or invalid.
 */
export const getRelativePreferenceDate = (
  value: string | number | null | undefined,
  relativeThresholdInHrs = 1
): RelativePreferenceDate | undefined => {
  if (value == null) {
    return undefined;
  }

  const maybeDate = getMaybeDate(value);
  if (!maybeDate.isValid()) {
    return undefined;
  }

  const date = maybeDate.toDate();
  return {
    date,
    displayPreferenceTime: moment(date).add(relativeThresholdInHrs, 'hours').isBefore(new Date()),
  };
};
