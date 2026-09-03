/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../../translations';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface FormatRelativeUpdatedAtArgs {
  now?: number;
  updatedAt: string;
}

/**
 * Compact last-updated label (`now` / `1m` / `1h` / `1d`) for chat rows.
 */
export const formatRelativeUpdatedAt = ({
  now = Date.now(),
  updatedAt,
}: FormatRelativeUpdatedAtArgs): string | undefined => {
  const parsed = Date.parse(updatedAt);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  const seconds = Math.max(0, Math.floor((now - parsed) / 1000));

  if (seconds < MINUTE) {
    return i18n.UPDATED_JUST_NOW;
  }

  if (seconds < HOUR) {
    return i18n.updatedMinutesLabel(Math.floor(seconds / MINUTE));
  }

  if (seconds < DAY) {
    return i18n.updatedHoursLabel(Math.floor(seconds / HOUR));
  }

  return i18n.updatedDaysLabel(Math.floor(seconds / DAY));
};
