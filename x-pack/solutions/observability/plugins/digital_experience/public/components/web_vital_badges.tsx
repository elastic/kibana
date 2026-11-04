/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreWebVital, VitalRating } from '../../common/core_web_vitals';
import { CORE_WEB_VITALS, getVitalRating } from '../../common/core_web_vitals';
import type { SessionWebVitals } from '../../common/sessions';
import { formatDurationMs } from '../utils/format_duration';

const RATING_COLORS: Record<VitalRating, 'success' | 'warning' | 'danger'> = {
  good: 'success',
  needsImprovement: 'warning',
  poor: 'danger',
};

const RATING_LABELS: Record<VitalRating, string> = {
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

/** One vital's value, colored by its rating, with the rating in a tooltip. */
export function WebVitalBadge({
  vital,
  value,
  showLabel = true,
}: {
  vital: CoreWebVital;
  value: number;
  /** Leaves out the vital's name, e.g. in a column already named after it. */
  showLabel?: boolean;
}) {
  const rating = getVitalRating(vital, value);
  return (
    <EuiToolTip content={RATING_LABELS[rating]}>
      <EuiBadge
        color={RATING_COLORS[rating]}
        tabIndex={0}
        data-test-subj={`digitalExperienceWebVital-${vital}`}
        data-rating={rating}
      >
        {showLabel
          ? `${VITAL_LABELS[vital]} ${formatVital(vital, value)}`
          : formatVital(vital, value)}
      </EuiBadge>
    </EuiToolTip>
  );
}

/** The measured Core Web Vitals, colored by their rating; renders nothing without any. */
export function WebVitalBadges({
  webVitals,
  'data-test-subj': dataTestSubj,
}: {
  webVitals: SessionWebVitals;
  'data-test-subj'?: string;
}) {
  const measured = CORE_WEB_VITALS.flatMap((vital) => {
    const value = webVitals[vital];
    return value === null ? [] : [{ vital, value }];
  });
  if (measured.length === 0) {
    return null;
  }
  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} data-test-subj={dataTestSubj}>
      {measured.map(({ vital, value }) => (
        <EuiFlexItem grow={false} key={vital}>
          <WebVitalBadge vital={vital} value={value} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
