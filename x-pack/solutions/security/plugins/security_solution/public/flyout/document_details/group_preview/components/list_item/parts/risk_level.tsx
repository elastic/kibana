/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { getRiskLevel } from '../../../../../../../common/entity_analytics/risk_engine/risk_levels';
import { RISK_SEVERITY_COLOUR } from '../../../../../../entity_analytics/common/utils';
import type { EntitySpecificFields } from '../types';

export interface RiskLevelProps {
  risk: NonNullable<EntitySpecificFields['risk']>;
}

export const RiskLevel = ({ risk }: RiskLevelProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.xxs};
      `}
    >
      <EuiIcon type="dot" size="s" color={RISK_SEVERITY_COLOUR[getRiskLevel(risk)]} />
      <EuiText
        size="s"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {getRiskLevel(risk)}
      </EuiText>
    </div>
  );
};
