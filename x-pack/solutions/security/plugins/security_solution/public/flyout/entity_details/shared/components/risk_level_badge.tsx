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
import { RISK_SEVERITY_COLOUR } from '../../../../entity_analytics/common/utils';
import { getRiskScoreColors } from '../../../../entity_analytics/components/home/entities_table/risk_score_cell';
import { useNewEntityAnalyticsPage } from '../../../../entity_analytics/hooks/use_new_entity_analytics_page';

interface RiskLevelBadgeProps {
  riskLevel: RiskSeverity;
}

export const RiskLevelBadge: React.FC<RiskLevelBadgeProps> = ({ riskLevel }) => {
  const isNewEntityAnalyticsPage = useNewEntityAnalyticsPage();
  const { euiTheme } = useEuiTheme();
  const label = (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.riskBadge"
      defaultMessage="Risk: {level}"
      values={{ level: riskLevel }}
    />
  );

  if (!isNewEntityAnalyticsPage) {
    return <EuiBadge color={RISK_SEVERITY_COLOUR[riskLevel]}>{label}</EuiBadge>;
  }

  const colors = getRiskScoreColors(euiTheme, riskLevel);

  return (
    <EuiBadge color={colors.background}>
      <EuiText
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
        size="xs"
        color={colors.text}
      >
        {label}
      </EuiText>
    </EuiBadge>
  );
};
