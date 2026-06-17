/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts a date math string to a duration string by removing the 'now-' prefix.
 *
 * @param historyStart - Date math string to convert. For example, "now-30d".
 * @returns Resulting duration string. For example, "30d".
 */
export const convertDateMathToDuration = (dateMathString: string): string => {
  if (dateMathString.startsWith('now-')) {
    return dateMathString.substring(4);
  }

  return dateMathString;
};

/**
 * Converts a duration string to a dateMath string by adding the 'now-' prefix.
 *
 * @param durationString - Duration string to convert. For example, "30d".
 * @returns Resulting date math string. For example, "now-30d".
 */
export const convertDurationToDateMath = (durationString: string): string =>
  `now-${durationString}`;
