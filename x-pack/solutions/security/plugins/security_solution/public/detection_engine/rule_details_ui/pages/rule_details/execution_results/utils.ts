/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getFormattedDurationString,
  ONE_MILLISECOND_AS_NANOSECONDS,
} from '../../../../../timelines/components/formatted_duration/helpers';

export const humanizeDuration = (ms: number): string => {
  if (ms === 0) {
    return '0 ms';
  }

  return getFormattedDurationString(ms * ONE_MILLISECOND_AS_NANOSECONDS);
};

export const shortenUuid = (uuid: unknown): string | null => {
  if (typeof uuid === 'string') {
    return uuid.slice(0, 8);
  }

  return null;
};
