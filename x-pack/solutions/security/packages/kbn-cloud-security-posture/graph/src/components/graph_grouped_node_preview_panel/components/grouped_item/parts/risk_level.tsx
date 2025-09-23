/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { getRiskLevel } from '@kbn/security-solution-plugin/common/entity_analytics/risk_engine';
import { RISK_SEVERITY_COLOUR } from '@kbn/security-solution-plugin/public/entity_analytics/common';
import { EntityRiskLevelsEnum } from '@kbn/security-solution-plugin/common/api/entity_analytics/common';
import { i18nNamespaceKey } from '../utils';
import type { EntitySpecificFields } from '../types';

/**
 * Get localized risk level text for display in the UI
 * @param riskLevel The risk level enum value
 * @returns Localized string for the risk level
 */
export const getRiskLevelDisplayText = (riskLevel: keyof typeof EntityRiskLevelsEnum) => {
  switch (riskLevel) {
    case EntityRiskLevelsEnum.Critical:
      return i18n.translate(`${i18nNamespaceKey}.riskLevel.critical`, {
        defaultMessage: 'Critical',
      });
    case EntityRiskLevelsEnum.High:
      return i18n.translate(`${i18nNamespaceKey}.riskLevel.high`, {
        defaultMessage: 'High',
      });
    case EntityRiskLevelsEnum.Moderate:
      return i18n.translate(`${i18nNamespaceKey}.riskLevel.moderate`, {
        defaultMessage: 'Moderate',
      });
    case EntityRiskLevelsEnum.Low:
      return i18n.translate(`${i18nNamespaceKey}.riskLevel.low`, {
        defaultMessage: 'Low',
      });
    case EntityRiskLevelsEnum.Unknown:
      return i18n.translate(`${i18nNamespaceKey}.riskLevel.unknown`, {
        defaultMessage: 'Unknown',
      });
    default:
      return riskLevel;
  }
};

export const RiskLevel = ({ risk }: { risk: NonNullable<EntitySpecificFields['risk']> }) => {
  const { euiTheme } = useEuiTheme();
  const riskLevel = getRiskLevel(risk);
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.xxs};
      `}
    >
      <EuiIcon type="dot" size="s" color={RISK_SEVERITY_COLOUR[riskLevel]} />
      <EuiText
        size="s"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {getRiskLevelDisplayText(riskLevel)}
      </EuiText>
    </div>
  );
};
