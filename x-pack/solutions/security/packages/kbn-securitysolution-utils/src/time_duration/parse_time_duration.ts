/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TimeDuration {
  value: number;
  unit: 's' | 'm' | 'h' | 'd';
}

/**
 * Parses a duration string and returns value and units.
 * Returns `undefined` when unable to parse.
 *
 * Recognizes
 *  - seconds (e.g. 2s)
 *  - minutes (e.g. 5m)
 *  - hours (e.g. 7h)
 *  - days (e.g. 9d)
 */
export function parseTimeDuration(input: string): TimeDuration | undefined {
  const matchArray = input.match(TIME_DURATION_REGEX);

  if (!matchArray) {
    return;
  }

  return { value: parseInt(matchArray[1], 10), unit: matchArray[2] as TimeDuration['unit'] };
}

const TIME_DURATION_REGEX = /^((?:\-|\+)?[0-9]+)(s|m|h|d)$/;
