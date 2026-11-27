/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiHealth } from '@elastic/eui';
import type { VitalRating } from '../../common/core_web_vitals';
import type { VitalRatings } from '../../common/types/applications';
import { RATING_COLORS, RATING_LABELS } from '../utils/web_vitals';

/** In display order. */
const VITAL_RATINGS: VitalRating[] = ['good', 'needsImprovement', 'poor'];

/** The share of a vital's samples in each rating, good first, e.g. in a tooltip. */
export function VitalRatingShares({
  ratings,
  formatPercent,
}: {
  ratings: VitalRatings;
  formatPercent: (share: number) => string;
}) {
  return (
    <EuiFlexGroup
      data-test-subj="digitalExperienceVitalRatings"
      direction="column"
      gutterSize="xs"
      responsive={false}
    >
      {VITAL_RATINGS.map((rating) => (
        <EuiFlexGroup key={rating} justifyContent="spaceBetween" gutterSize="l" responsive={false}>
          <EuiHealth color={RATING_COLORS[rating]}>{RATING_LABELS[rating]}</EuiHealth>
          <span>{formatPercent(ratings[rating])}</span>
        </EuiFlexGroup>
      ))}
    </EuiFlexGroup>
  );
}
