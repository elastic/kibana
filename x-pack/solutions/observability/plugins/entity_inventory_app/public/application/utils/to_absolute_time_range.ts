/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { TimeRange } from '@kbn/es-query';

/** Resolves a (possibly relative) time range to ISO instants, or `undefined` when invalid. */
export const toAbsoluteTimeRange = (
  range: TimeRange,
  now: Date = new Date()
): { from: string; to: string } | undefined => {
  const from = dateMath.parse(range.from, { forceNow: now });
  const to = dateMath.parse(range.to, { roundUp: true, forceNow: now });

  if (!from?.isValid() || !to?.isValid()) {
    return undefined;
  }

  return { from: from.toISOString(), to: to.toISOString() };
};
