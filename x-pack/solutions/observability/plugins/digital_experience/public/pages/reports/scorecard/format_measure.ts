/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MeasureUnit } from '../../../../common/types/scorecard';
import type { Formatters } from '../../../hooks/use_formatters';

const NO_VALUE = '–';

const formatMs = (ms: number): string =>
  ms >= 1000
    ? i18n.translate('xpack.digitalExperience.report.scorecard.seconds', {
        defaultMessage: '{value} s',
        values: { value: (ms / 1000).toFixed(2) },
      })
    : i18n.translate('xpack.digitalExperience.report.scorecard.milliseconds', {
        defaultMessage: '{value} ms',
        values: { value: Math.round(ms) },
      });

/** A measure's value in its unit, with the user's number formats; a dash without one. */
export const formatMeasureValue = (
  value: number | null,
  unit: MeasureUnit,
  { formatNumber, formatPercent }: Pick<Formatters, 'formatNumber' | 'formatPercent'>
): string => {
  if (value === null) {
    return NO_VALUE;
  }
  switch (unit) {
    case 'count':
      return formatNumber(value);
    case 'ms':
      return formatMs(value);
    case 'score':
      return value.toFixed(3);
    case 'rate':
      return value.toFixed(1);
    case 'ratio':
      return formatPercent(value);
  }
};

/** The relative change to the previous period with its sign; a dash when there's none. */
export const formatMeasureChange = (
  change: number | null,
  { formatPercent }: Pick<Formatters, 'formatPercent'>
): string => {
  if (change === null) {
    return NO_VALUE;
  }
  const text = formatPercent(Math.abs(change));
  // A change that rounds to zero has no sign.
  if (Number(text.replace(/[^0-9.]/g, '')) === 0) {
    return text;
  }
  return `${change > 0 ? '+' : '−'}${text}`;
};
