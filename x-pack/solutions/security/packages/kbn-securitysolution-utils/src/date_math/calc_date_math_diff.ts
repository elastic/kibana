/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';

/**
 * Calculates difference between date math expressions in milliseconds.
 */
export function calcDateMathDiff(start: string, end: string): number | undefined {
  const now = new Date();
  const startMoment = dateMath.parse(start, { forceNow: now });
  const endMoment = dateMath.parse(end, { forceNow: now });

  if (!startMoment || !endMoment) {
    return undefined;
  }

  const result = endMoment.diff(startMoment, 'ms');

  return !isNaN(result) ? result : undefined;
}
