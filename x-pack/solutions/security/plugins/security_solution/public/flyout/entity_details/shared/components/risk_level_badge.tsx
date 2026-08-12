/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import type { RiskSeverity } from '../../../../../common/search_strategy';
import { getRiskScoreColors } from '../../../../entity_analytics/components/home/entities_table/risk_score_cell';

interface RiskLevelBadgeProps {
  riskLevel: RiskSeverity;
}

/**
 * Header risk badge — same severity colours as the Entities table risk score
 * cell, with the “Risk: {level}” label kept for the flyout context.
 */
export const RiskLevelBadge: React.FC<RiskLevelBadgeProps> = ({ riskLevel }) => {
  const { euiTheme } = useEuiTheme();
  const colors = getRiskScoreColors(euiTheme, riskLevel);

  return (
    <EuiBadge color={colors.background} data-test-subj="entity-panel-header-risk-badge">
      <EuiText
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
        size="xs"
        color={colors.text}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskBadge"
          defaultMessage="Risk: {level}"
          values={{ level: riskLevel }}
        />
      </EuiText>
    </EuiBadge>
  );
};
