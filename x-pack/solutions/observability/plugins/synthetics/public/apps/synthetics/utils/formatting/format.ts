/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

// one second = 1 million micros
const ONE_SECOND_AS_MICROS = 1000000;

// the limit for converting to seconds is >= 1 sec
const MILLIS_LIMIT = ONE_SECOND_AS_MICROS * 1;

const NUM_MICROSECONDS_IN_MILLISECOND = 1000;

/**
 * This simply converts microseconds to milliseconds. People tend to prefer ms to us
 * when visualizing request duration times.
 */
const microsToMillis = (microseconds: number | null): number | null => {
  if (!microseconds && microseconds !== 0) return null;
  return Math.floor(microseconds / NUM_MICROSECONDS_IN_MILLISECOND);
};

export const formatDuration = (durationMicros: number, { noSpace }: { noSpace?: true } = {}) => {
  if (durationMicros < MILLIS_LIMIT) {
    if (noSpace) {
      return i18n.translate('xpack.synthetics.overview.durationMsFormattingNoSpace', {
        values: { millis: microsToMillis(durationMicros) },
        defaultMessage: '{millis}ms',
      });
    }
    return i18n.translate('xpack.synthetics.overview.durationMsFormatting', {
      values: { millis: microsToMillis(durationMicros) },
      defaultMessage: '{millis} ms',
    });
  }
  const seconds = (durationMicros / ONE_SECOND_AS_MICROS).toFixed(0);

  if (noSpace) {
    return i18n.translate('xpack.synthetics.overview.durationSecondsFormattingNoSpace', {
      values: { seconds },
      defaultMessage: '{seconds}s',
    });
  }

  return i18n.translate('xpack.synthetics.overview.durationSecondsFormatting', {
    values: { seconds },
    defaultMessage: '{seconds} s',
  });
};
