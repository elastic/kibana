/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clamp } from 'lodash/fp';

import type { EuiThemeComputed } from '@elastic/eui';
import {
  RISK_SCORE_MEDIUM,
  RISK_SCORE_HIGH,
  RISK_SCORE_CRITICAL,
} from '../../../../../../../../common/detection_engine/constants';
import { getRiskSeverityColors } from '../../../../../../../common/utils/risk_color_palette';

/**
 * The detection engine creates risk scores in the range 1 - 100.
 * These steps also include a score of "zero", to enable lookups
 * via an array index.
 */
export const RISK_SCORE_STEPS = 101;

/**
 * Returns a color palette that maps a risk score to the risk score colors
 * defined by the Security Solution.
 *
 * The pallet defines values for a risk score between 0 and 100 (inclusive),
 * but in practice, the detection engine only generates scores between 1-100.
 *
 * This pallet has the same type as `EuiPalette`, which is not exported by
 * EUI at the time of this writing.
 */
export const getRiskScorePalette = (steps: number, euiTheme: EuiThemeComputed): string[] => {
  const palette = getRiskSeverityColors(euiTheme);
  return Array(steps)
    .fill(0)
    .map((_, i) => {
      if (i >= RISK_SCORE_CRITICAL) {
        return palette.critical;
      } else if (i >= RISK_SCORE_HIGH) {
        return palette.high;
      } else if (i >= RISK_SCORE_MEDIUM) {
        return palette.medium;
      } else {
        return palette.low;
      }
    });
};

/** Returns a fill color based on the index of the risk score in the color palette */
export const getFillColor = ({
  riskScore,
  colorPalette,
}: {
  riskScore: number;
  colorPalette: string[];
}): string => {
  const MIN_RISK_SCORE = 0;
  const MAX_RISK_SCORE = Math.min(100, colorPalette.length);

  const clampedScore = clamp(MIN_RISK_SCORE, MAX_RISK_SCORE, riskScore);

  return colorPalette[clampedScore];
};
