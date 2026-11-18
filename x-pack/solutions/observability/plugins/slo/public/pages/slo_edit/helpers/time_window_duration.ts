/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeWindowType } from '@kbn/slo-schema';
import { CALENDARALIGNED_TIMEWINDOW_OPTIONS, ROLLING_TIMEWINDOW_OPTIONS } from '../constants';

export const getTimeWindowDurationOptions = (
  type: TimeWindowType
): Array<{ value: string; text: string }> =>
  type === 'calendarAligned' ? CALENDARALIGNED_TIMEWINDOW_OPTIONS : ROLLING_TIMEWINDOW_OPTIONS;

export const pickTimeWindowDuration = (type: TimeWindowType, initialDuration?: string): string => {
  const options = getTimeWindowDurationOptions(type);
  return options.find(({ value }) => value === initialDuration)?.value ?? options[1].value;
};
