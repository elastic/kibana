/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { CoreWebVital } from '../../common/core_web_vitals';
import { CORE_WEB_VITALS, getVitalRating } from '../../common/core_web_vitals';
import type { SessionWebVitals } from '../../common/sessions';
import { formatVital, RATING_COLORS, RATING_LABELS, VITAL_LABELS } from '../utils/web_vitals';

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
