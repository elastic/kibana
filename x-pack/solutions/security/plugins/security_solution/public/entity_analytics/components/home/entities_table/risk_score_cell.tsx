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

import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { formatRiskScore } from '../../../common/utils';
import { getRiskLevel } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
import type { EntityRiskLevels } from '../../../../../common/api/entity_analytics/common';

export const getRiskScoreColors = (
  euiTheme: EuiThemeComputed,
  riskLevel: EntityRiskLevels
): { background: string; text: string } => {
  switch (riskLevel) {
    case 'Unknown':
      return {
        background: euiTheme.colors.backgroundBaseSubdued,
        text: euiTheme.colors.textSubdued,
      };
    case 'Low':
      return {
        background: euiTheme.colors.backgroundBaseNeutral,
        text: euiTheme.colors.textNeutral,
      };
    case 'Moderate':
      return {
        background: euiTheme.colors.backgroundLightWarning,
        text: euiTheme.colors.textWarning,
      };
    case 'High':
      return {
        background: euiTheme.colors.backgroundLightRisk,
        text: euiTheme.colors.textRisk,
      };
    case 'Critical':
      return {
        background: euiTheme.colors.backgroundLightDanger,
        text: euiTheme.colors.textDanger,
      };
    default:
      return {
        background: euiTheme.colors.backgroundBaseSubdued,
        text: euiTheme.colors.textSubdued,
      };
  }
};

export const RiskScoreCell: React.FC<{ riskScore?: number }> = ({ riskScore }) => {
  const { euiTheme } = useEuiTheme();

  if (riskScore == null) {
    return getEmptyTagValue();
  }

  const riskLevel = getRiskLevel(riskScore);
  const colors = getRiskScoreColors(euiTheme, riskLevel);

  return (
    <EuiBadge color={colors.background}>
      <EuiText
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
        size="s"
        color={colors.text}
      >
        {formatRiskScore(riskScore)}
      </EuiText>
    </EuiBadge>
  );
};
