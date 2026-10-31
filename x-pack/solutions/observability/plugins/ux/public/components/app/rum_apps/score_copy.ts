/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RumVitalRating } from '../../../../common/rum_app';
import type { RumPerformanceVital } from '../../../../common/rum_performance_score';

export const scoreEmptyLabel = i18n.translate('xpack.ux.inventory.emptyValueLabel', {
  defaultMessage: '—',
});

export const scoreBandLabel = (score: number): string => {
  if (score >= 90) {
    return i18n.translate('xpack.ux.inventory.scoreBandGoodLabel', { defaultMessage: 'Good' });
  }
  if (score >= 50) {
    return i18n.translate('xpack.ux.inventory.scoreBandNeedsWorkLabel', {
      defaultMessage: 'Needs improvement',
    });
  }
  return i18n.translate('xpack.ux.inventory.scoreBandPoorLabel', { defaultMessage: 'Poor' });
};

export const performanceVitalLabel = (name: RumPerformanceVital): string => {
  switch (name) {
    case 'lcp':
      return i18n.translate('xpack.ux.inventory.lcpColumnLabel', { defaultMessage: 'LCP' });
    case 'inp':
      return i18n.translate('xpack.ux.inventory.inpColumnLabel', { defaultMessage: 'INP' });
    case 'cls':
      return i18n.translate('xpack.ux.inventory.clsColumnLabel', { defaultMessage: 'CLS' });
    case 'fcp':
      return i18n.translate('xpack.ux.inventory.fcpColumnLabel', { defaultMessage: 'FCP' });
    case 'ttfb':
      return i18n.translate('xpack.ux.inventory.ttfbColumnLabel', { defaultMessage: 'TTFB' });
  }
};

export const ratingLabel = (rating: RumVitalRating): string => {
  if (rating === 'good') {
    return i18n.translate('xpack.ux.scoreBreakdown.goodRatingLabel', { defaultMessage: 'Good' });
  }
  if (rating === 'ni') {
    return i18n.translate('xpack.ux.scoreBreakdown.needsImprovementRatingLabel', {
      defaultMessage: 'Needs improvement',
    });
  }
  return i18n.translate('xpack.ux.scoreBreakdown.poorRatingLabel', { defaultMessage: 'Poor' });
};

export const formatPercent = (ratio: number): string => `${Math.round(ratio * 1000) / 10}%`;

export const formatPercentPoints = (percent: number): string => `${Math.round(percent)}%`;

export const formatVitalP75 = (name: RumPerformanceVital, value: number | null): string => {
  if (value == null) {
    return scoreEmptyLabel;
  }
  if (name === 'cls') {
    return value.toFixed(3);
  }
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
};
