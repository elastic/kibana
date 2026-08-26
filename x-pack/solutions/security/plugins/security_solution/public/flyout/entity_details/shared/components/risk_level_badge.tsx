/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import type { RiskSeverity } from '../../../../../common/search_strategy';
import { RISK_SEVERITY_COLOUR } from '../../../../entity_analytics/common/utils';

interface RiskLevelBadgeProps {
  riskLevel: RiskSeverity;
}

export const RiskLevelBadge: React.FC<RiskLevelBadgeProps> = ({ riskLevel }) => {
  return (
    <EuiBadge color={RISK_SEVERITY_COLOUR[riskLevel]}>
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskBadge"
        defaultMessage="Risk: {level}"
        values={{ level: riskLevel }}
      />
    </EuiBadge>
  );
};
