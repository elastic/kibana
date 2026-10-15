/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { TimeRange } from '../../../../../common/store/inputs/model';

/**
 * Attack Discovery's default alert window. A schedule with a longer window can produce alerts
 * outside this range, since the attack does not record its window (#298153).
 */
const ATTACK_LOOKBACK_HOURS = 24;

/**
 * The Timeline range holding the attacks' alerts, from the oldest attack's window to now, since
 * Timeline's default range would hide older alerts the filter names by id.
 *
 * It ends at now because an alert can be slightly newer than the attack that references it.
 * Returns `undefined` when no attack has a usable timestamp.
 */
export const getAttacksTimeRange = (
  timestamps: Array<string | undefined>
): TimeRange | undefined => {
  const detectedOn = timestamps.flatMap((timestamp) => {
    // `moment(undefined)` is now, which would silently anchor the range on the wrong moment.
    if (timestamp == null) {
      return [];
    }

    const parsed = moment(timestamp, moment.ISO_8601);

    return parsed.isValid() ? [parsed] : [];
  });

  if (detectedOn.length === 0) {
    return undefined;
  }

  return {
    kind: 'absolute',
    from: moment.min(detectedOn).clone().subtract(ATTACK_LOOKBACK_HOURS, 'hours').toISOString(),
    to: moment().toISOString(),
  };
};
