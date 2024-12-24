/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { ML_SEVERITY_COLORS } from '@kbn/ml-anomaly-utils/severity_colors';

interface Props {
  score: number;
}

export const getScoreString = (score: number) => String(Math.ceil(score));

export const ScoreHealth = React.memo<Props>(({ score }) => {
  const scoreCeiling = getScoreString(score);
  const color = getSeverityColor(score);
  return <EuiHealth color={color}>{scoreCeiling}</EuiHealth>;
});

ScoreHealth.displayName = 'ScoreHealth';

// ಠ_ಠ A hard-fork of the @kbn/ml-anomaly-utils;#getSeverityColor ಠ_ಠ
//
// Returns a severity label (one of critical, major, minor, warning, low or unknown)
// for the supplied normalized anomaly score (a value between 0 and 100), where scores
// less than 3 are assigned a severity of 'low'.
export const getSeverityColor = (normalizedScore: number): string => {
  if (normalizedScore >= 75) {
    return ML_SEVERITY_COLORS.CRITICAL;
  } else if (normalizedScore >= 50) {
    return ML_SEVERITY_COLORS.MAJOR;
  } else if (normalizedScore >= 25) {
    return ML_SEVERITY_COLORS.MINOR;
  } else if (normalizedScore >= 3) {
    return ML_SEVERITY_COLORS.WARNING;
  } else if (normalizedScore >= 0) {
    return ML_SEVERITY_COLORS.LOW;
  } else {
    return ML_SEVERITY_COLORS.UNKNOWN;
  }
};
