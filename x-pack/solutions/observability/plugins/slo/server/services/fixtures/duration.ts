/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration, DurationUnit } from '../../domain/models';

export function thirtyDays(): Duration {
  return new Duration(30, DurationUnit.Day);
}

export function ninetyDays(): Duration {
  return new Duration(90, DurationUnit.Day);
}

export function oneMonth(): Duration {
  return new Duration(1, DurationUnit.Month);
}

export function sevenDays(): Duration {
  return new Duration(7, DurationUnit.Day);
}

export function oneWeek(): Duration {
  return new Duration(1, DurationUnit.Week);
}

export function twoWeeks(): Duration {
  return new Duration(2, DurationUnit.Week);
}

export function sixHours(): Duration {
  return new Duration(6, DurationUnit.Hour);
}

export function oneMinute(): Duration {
  return new Duration(1, DurationUnit.Minute);
}

export function twoMinute(): Duration {
  return new Duration(2, DurationUnit.Minute);
}

export function fiveMinute(): Duration {
  return new Duration(5, DurationUnit.Minute);
}
