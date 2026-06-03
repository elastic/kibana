/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

/*
 * BA-v.2: matches the risk-score badge palette in `RiskScoreCell` so anomaly
 * scores look visually identical to risk scores. Score thresholds remain the
 * standard ML anomaly buckets (3/25/50/75/100).
 */
const getAnomalyScoreColors = (score: number, euiTheme: EuiThemeComputed) => {
  if (score < 3) {
    return {
      background: euiTheme.colors.backgroundBaseSubdued,
      text: euiTheme.colors.textSubdued,
    };
  }
  if (score < 25) {
    return {
      background: euiTheme.colors.backgroundBaseNeutral,
      text: euiTheme.colors.textNeutral,
    };
  }
  if (score < 50) {
    return {
      background: euiTheme.colors.backgroundLightWarning,
      text: euiTheme.colors.textWarning,
    };
  }
  if (score < 75) {
    return {
      background: euiTheme.colors.backgroundLightRisk,
      text: euiTheme.colors.textRisk,
    };
  }
  return {
    background: euiTheme.colors.backgroundLightDanger,
    text: euiTheme.colors.textDanger,
  };
};

export const AnomalyScoreBadgeV2: React.FC<{ score: number }> = ({ score }) => {
  const { euiTheme } = useEuiTheme();
  const colors = getAnomalyScoreColors(score, euiTheme);

  return (
    <EuiBadge color={colors.background}>
      <EuiText
        size="xs"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
        color={colors.text}
      >
        {score.toFixed(2)}
      </EuiText>
    </EuiBadge>
  );
};
