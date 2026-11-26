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

const formatMs = (ms: number, formatDecimal: Formatters['formatDecimal']): string =>
  ms >= 1000
    ? i18n.translate('xpack.digitalExperience.report.scorecard.seconds', {
        defaultMessage: '{value} s',
        values: { value: formatDecimal(ms / 1000, 2) },
      })
    : i18n.translate('xpack.digitalExperience.report.scorecard.milliseconds', {
        defaultMessage: '{value} ms',
        values: { value: Math.round(ms) },
      });

/** What the KPI percent format shows as a whole: the smallest share it tells from 0% or 100%. */
const SMALLEST_SHARE = 0.001;

/**
 * A share to one decimal, except next to 0% and 100%: there a share that rounds to them is shown
 * as less than the smallest one or more than the largest, so that one failed request in 10,000
 * is not shown as none, nor one in 10,000 that went well as all.
 */
const formatShare = (share: number, formatKpiPercent: Formatters['formatKpiPercent']): string => {
  if (share > 0 && share < SMALLEST_SHARE / 2) {
    return i18n.translate('xpack.digitalExperience.report.scorecard.lessThanShare', {
      defaultMessage: '<{value}',
      values: { value: formatKpiPercent(SMALLEST_SHARE) },
    });
  }
  if (share < 1 && share > 1 - SMALLEST_SHARE / 2) {
    return i18n.translate('xpack.digitalExperience.report.scorecard.moreThanShare', {
      defaultMessage: '>{value}',
      values: { value: formatKpiPercent(1 - SMALLEST_SHARE) },
    });
  }
  return formatKpiPercent(share);
};

/** A measure's value in its unit, with the user's number formats; a dash without one. */
export const formatMeasureValue = (
  value: number | null,
  unit: MeasureUnit,
  {
    formatNumber,
    formatDecimal,
    formatKpiPercent,
  }: Pick<Formatters, 'formatNumber' | 'formatDecimal' | 'formatKpiPercent'>
): string => {
  if (value === null) {
    return NO_VALUE;
  }
  switch (unit) {
    case 'count':
      return formatNumber(value);
    case 'ms':
      return formatMs(value, formatDecimal);
    case 'score':
      return formatDecimal(value, 3);
    case 'rate':
      return formatDecimal(value, 1);
    case 'ratio':
      return formatShare(value, formatKpiPercent);
  }
};

/** The relative change to the previous period with its sign; a dash when there's none. */
export const formatMeasureChange = (
  change: number | null,
  { formatSignedPercent }: Pick<Formatters, 'formatSignedPercent'>
): string => (change === null ? NO_VALUE : formatSignedPercent(change));
