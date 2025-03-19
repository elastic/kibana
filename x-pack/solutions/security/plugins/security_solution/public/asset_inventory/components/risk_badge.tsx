/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { RiskSeverity } from '../../../common/search_strategy';
import { RISK_SEVERITY_COLOUR } from '../../entity_analytics/common/utils';
import { getRiskLevel } from '../../../common/entity_analytics/risk_engine/risk_levels';

export interface RiskBadgeProps {
  risk: number;
  'data-test-subj'?: string;
}

const tooltips = {
  [RiskSeverity.Unknown]: i18n.translate(
    'xpack.securitySolution.assetInventory.allAssets.risks.unknown',
    { defaultMessage: RiskSeverity.Unknown }
  ),
  [RiskSeverity.Low]: i18n.translate('xpack.securitySolution.assetInventory.allAssets.risks.low', {
    defaultMessage: RiskSeverity.Low,
  }),
  [RiskSeverity.Moderate]: i18n.translate(
    'xpack.securitySolution.assetInventory.allAssets.risks.moderate',
    { defaultMessage: RiskSeverity.Moderate }
  ),
  [RiskSeverity.High]: i18n.translate(
    'xpack.securitySolution.assetInventory.allAssets.risks.high',
    { defaultMessage: RiskSeverity.High }
  ),
  [RiskSeverity.Critical]: i18n.translate(
    'xpack.securitySolution.assetInventory.allAssets.risks.critical',
    { defaultMessage: RiskSeverity.Critical }
  ),
};

export const RiskBadge = ({ risk, ...props }: RiskBadgeProps) => {
  const riskLevel = getRiskLevel(risk);
  const color = RISK_SEVERITY_COLOUR[riskLevel];
  return (
    <EuiToolTip content={tooltips[riskLevel]}>
      <EuiBadge {...props} color={color}>
        {risk}
      </EuiBadge>
    </EuiToolTip>
  );
};
