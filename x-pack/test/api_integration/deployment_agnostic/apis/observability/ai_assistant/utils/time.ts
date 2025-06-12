/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duration, unitOfTime } from 'moment';

export function durationAsMs(value: number, unit: unitOfTime.DurationConstructor) {
  return duration(value, unit).asMilliseconds();
}

export function dateAsTimestamp(value: string) {
  return new Date(value).getTime();
}

export function sleep(value: number) {
  return new Promise((resolve) => setTimeout(resolve, value));
}
