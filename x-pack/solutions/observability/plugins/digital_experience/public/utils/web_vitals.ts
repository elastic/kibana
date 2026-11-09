/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreWebVital, VitalRating } from '../../common/core_web_vitals';
import { formatDurationMs } from './format_duration';

export const RATING_COLORS: Record<VitalRating, 'success' | 'warning' | 'danger'> = {
  good: 'success',
  needsImprovement: 'warning',
  poor: 'danger',
};

export const RATING_LABELS: Record<VitalRating, string> = {
  good: i18n.translate('xpack.digitalExperience.sessionDetail.vitals.goodLabel', {
    defaultMessage: 'Good',
  }),
  needsImprovement: i18n.translate(
    'xpack.digitalExperience.sessionDetail.vitals.needsImprovementLabel',
    { defaultMessage: 'Needs improvement' }
  ),
  poor: i18n.translate('xpack.digitalExperience.sessionDetail.vitals.poorLabel', {
    defaultMessage: 'Poor',
  }),
};

export const VITAL_LABELS: Record<CoreWebVital, string> = {
  lcp: i18n.translate('xpack.digitalExperience.sessionDetail.vitals.lcpLabel', {
    defaultMessage: 'LCP',
  }),
  inp: i18n.translate('xpack.digitalExperience.sessionDetail.vitals.inpLabel', {
    defaultMessage: 'INP',
  }),
  cls: i18n.translate('xpack.digitalExperience.sessionDetail.vitals.clsLabel', {
    defaultMessage: 'CLS',
  }),
  fcp: i18n.translate('xpack.digitalExperience.sessionDetail.vitals.fcpLabel', {
    defaultMessage: 'FCP',
  }),
  ttfb: i18n.translate('xpack.digitalExperience.sessionDetail.vitals.ttfbLabel', {
    defaultMessage: 'TTFB',
  }),
};

/**
 * A vital's value with its unit, as the Overview formats it: CLS is unitless (3 decimals, like the
 * applications list), the others are times.
 */
export const formatVital = (vital: CoreWebVital, value: number): string =>
  vital === 'cls' ? value.toFixed(3) : formatDurationMs(value);
