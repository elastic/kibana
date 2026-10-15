/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { TimeRange } from '../../../../../common/store/inputs/model';

/**
 * How far back from an attack's own timestamp the timeline looks.
 *
 * Matches Attack Discovery's default alert selection window, which is the widest span the alerts
 * behind an attack are normally drawn from.
 *
 * It is a default rather than a maximum. A schedule configured with a longer window, say
 * `start: now-7d`, can produce an attack whose oldest alerts fall outside this, and those alerts
 * stay hidden even though the filter names them by id. Fixing that needs the window the attack
 * was generated from, which the alert does not carry the way a detection alert carries
 * `kibana.alert.rule.from`. Tracked in #298153.
 */
const ATTACK_LOOKBACK_HOURS = 24;

/**
 * The window the attacks' alerts were drawn from, opened back from the oldest one detected.
 *
 * Timeline opens on the global time picker, Today by default, which hides every alert older than
 * it even though the filter names them by id. Taking the oldest of the attacks keeps the range
 * wide enough to hold the alerts behind all of them, which is how investigating a selection of
 * alerts already works.
 *
 * It ends at the present rather than at the newest attack, because a constituent alert can be
 * newer than the attack that references it: a scheduled generation stamps the attack with the
 * rule's `startedAt`, then retrieves alerts up to the `now` of a query that runs moments later.
 *
 * Attacks carrying no usable timestamp are skipped, and a selection of only those is left to the
 * caller's own time picker, which is the behaviour every attack surface had before this range
 * existed.
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
