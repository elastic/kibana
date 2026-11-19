/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const ONE_SECOND_MS = 1000;

/** A duration in milliseconds, in seconds from a second up, with its unit spelled out. */
export const formatDurationMs = (milliseconds: number): string => {
  const roundedMilliseconds = Math.round(milliseconds);
  return roundedMilliseconds < ONE_SECOND_MS
    ? i18n.translate('xpack.digitalExperience.duration.milliseconds', {
        defaultMessage: '{value} ms',
        values: { value: roundedMilliseconds },
      })
    : i18n.translate('xpack.digitalExperience.duration.seconds', {
        defaultMessage: '{value, number, ::.00} s',
        values: { value: milliseconds / ONE_SECOND_MS },
      });
};
