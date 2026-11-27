/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { toComparedValue } from '../../../../common/mobile/kpis';
import type { ScorecardMeasure } from '../../../../common/types/scorecard';
import type { Formatters } from '../../../hooks/use_formatters';
import { formatChange } from '../../../utils/compared_value';
import { formatDurationMs } from '../../../utils/format_duration';

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

/** A measure's value in its unit, with the user's number formats. */
export const formatMeasureValue = (
  value: number,
  unit: ScorecardMeasure['unit'],
  {
    formatNumber,
    formatDecimal,
    formatKpiPercent,
  }: Pick<Formatters, 'formatNumber' | 'formatDecimal' | 'formatKpiPercent'>
): string => {
  switch (unit) {
    case 'count':
      // Whole, though a baseline averages the count over its periods.
      return formatNumber(Math.round(value));
    case 'ms':
      return formatDurationMs(value);
    case 'score':
      return formatDecimal(value, 3);
    case 'rate':
      return formatDecimal(value, 1);
    case 'ratio':
      return formatShare(value, formatKpiPercent);
  }
};

/**
 * The change of a measure to the previous period as the Overview shows one: relative, or in
 * percentage points for shares; `undefined` without both values.
 */
export const formatMeasureChange = (
  { value, previous, changeUnit }: Pick<ScorecardMeasure, 'value' | 'previous' | 'changeUnit'>,
  formatters: Pick<Formatters, 'formatSignedNumber' | 'formatSignedPercent'>
): string | undefined =>
  formatChange(toComparedValue(value, previous), changeUnit, formatters)?.label;
