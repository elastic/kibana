/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calcDateMathDiff } from '@kbn/securitysolution-utils/date_math';
import { TimeDuration } from '@kbn/securitysolution-utils/time_duration';

interface RuleScheduleValidationPayload {
  interval?: string;
  from?: string;
  to?: string;
}

export const validateRuleSchedule = ({
  interval,
  from,
  to,
}: RuleScheduleValidationPayload): string[] => {
  if (interval == null || from == null || to == null) {
    return [];
  }

  const intervalDuration = TimeDuration.parse(interval);
  const timeRangeDuration = calcDateMathDiff(from, to);

  if (intervalDuration == null || timeRangeDuration == null) {
    return [];
  }

  if (timeRangeDuration < intervalDuration.toMilliseconds()) {
    return [
      'the time range defined by "from" and "to" must be greater than or equal to "interval"',
    ];
  }

  return [];
};
