/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const SECOND_MS = 1000;
const MINUTE_S = 60;
const HOUR_S = 60 * MINUTE_S;

/**
 * A session or page visit duration in its two largest units, e.g. `850 ms`, `42 s`, `3 min 20 s`
 * or `1 h 5 min`.
 */
export const formatSessionDuration = (milliseconds: number): string => {
  if (milliseconds < SECOND_MS) {
    return i18n.translate('xpack.digitalExperience.sessionDuration.milliseconds', {
      defaultMessage: '{milliseconds} ms',
      values: { milliseconds: Math.max(0, Math.round(milliseconds)) },
    });
  }
  const totalSeconds = Math.round(milliseconds / SECOND_MS);
  if (totalSeconds < MINUTE_S) {
    return i18n.translate('xpack.digitalExperience.sessionDuration.seconds', {
      defaultMessage: '{seconds} s',
      values: { seconds: totalSeconds },
    });
  }
  if (totalSeconds < HOUR_S) {
    return i18n.translate('xpack.digitalExperience.sessionDuration.minutes', {
      defaultMessage: '{minutes} min {seconds} s',
      values: { minutes: Math.floor(totalSeconds / MINUTE_S), seconds: totalSeconds % MINUTE_S },
    });
  }
  return i18n.translate('xpack.digitalExperience.sessionDuration.hours', {
    defaultMessage: '{hours} h {minutes} min',
    values: {
      hours: Math.floor(totalSeconds / HOUR_S),
      minutes: Math.floor((totalSeconds % HOUR_S) / MINUTE_S),
    },
  });
};
