/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RiskScoreCell } from '../../../../entity_analytics/components/home/entities_table/risk_score_cell';
import { RiskScoreLevel } from '../../../../entity_analytics/components/severity/common';
import type { RiskSeverity } from '../../../../../common/search_strategy';

interface RiskSummaryRowProps {
  riskScore?: number;
  riskLevel?: RiskSeverity;
}

const LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.card.riskScoreLabel',
  { defaultMessage: 'Risk score' }
);

export const RiskSummaryRow: React.FC<RiskSummaryRowProps> = ({ riskScore, riskLevel }) => {
  if (riskScore == null && !riskLevel) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        data-test-subj="entityAttachmentRiskSummary"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {LABEL}
          </EuiText>
        </EuiFlexItem>
        {riskScore != null && (
          <EuiFlexItem grow={false}>
            <RiskScoreCell riskScore={riskScore} />
          </EuiFlexItem>
        )}
        {riskLevel && (
          <EuiFlexItem grow={false}>
            <RiskScoreLevel
              severity={riskLevel}
              data-test-subj="entityAttachmentRiskLevel"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
