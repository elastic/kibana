/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Coarse "4s ago" / "12m ago" / "2h ago" label, matching the density the design asks for.
 *
 * The store stamps its seed timestamps relative to when Kibana started, so these stay believable for
 * the life of the process rather than drifting to a fixed date in the past.
 */
export const formatRelativeTime = (isoTimestamp: string): string => {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) {
    return isoTimestamp;
  }

  const seconds = Math.max(0, Math.round((Date.now() - parsed) / 1000));

  if (seconds < MINUTE) {
    return i18n.secondsAgoLabel(seconds);
  }
  if (seconds < HOUR) {
    return i18n.minutesAgoLabel(Math.round(seconds / MINUTE));
  }
  if (seconds < DAY) {
    return i18n.hoursAgoLabel(Math.round(seconds / HOUR));
  }
  return i18n.daysAgoLabel(Math.round(seconds / DAY));
};
