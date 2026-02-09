/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TimeUnitChar = 's' | 'm' | 'h' | 'd';

export const formatDurationFromTimeUnitChar = (time: number, unit: TimeUnitChar): string => {
  const sForPlural = time !== 0 && time > 1 ? 's' : ''; // Negative values are not taken into account
  switch (unit) {
    case 's':
      return `${time} sec${sForPlural}`;
    case 'm':
      return `${time} min${sForPlural}`;
    case 'h':
      return `${time} hr${sForPlural}`;
    case 'd':
      return `${time} day${sForPlural}`;
    default:
      return `${time} ${unit}`;
  }
};
