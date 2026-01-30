/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BurnRateWindow } from '../../hooks/use_fetch_burn_rate_windows';
import type { Status } from './burn_rate_status';

export function getStatus(
  threshold: number,
  longWindowBurnRate: number,
  shortWindowBurnRate: number
): Status {
  const isLongWindowBurnRateAboveThreshold = longWindowBurnRate > threshold;
  const isShortWindowBurnRateAboveThreshold = shortWindowBurnRate > threshold;
  const areBothBurnRatesAboveThreshold =
    isLongWindowBurnRateAboveThreshold && isShortWindowBurnRateAboveThreshold;

  return areBothBurnRatesAboveThreshold
    ? 'BREACHED'
    : isLongWindowBurnRateAboveThreshold && !isShortWindowBurnRateAboveThreshold
    ? 'RECOVERING'
    : !isLongWindowBurnRateAboveThreshold && isShortWindowBurnRateAboveThreshold
    ? 'INCREASING'
    : 'ACCEPTABLE';
}

export const burnRateWindowLabel = (option: BurnRateWindow) =>
  i18n.translate('xpack.slo.burnRates.optionLabel', {
    defaultMessage: '{duration, plural, one {# hour} other {# hours}}',
    values: { duration: option.longWindow.value },
  });
