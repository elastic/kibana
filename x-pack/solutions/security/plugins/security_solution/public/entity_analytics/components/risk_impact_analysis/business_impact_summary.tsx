/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiCallOut,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  BusinessImpact,
  RiskImpactAnalysisResponse,
} from '../../../../common/entity_analytics/risk_impact/types';

interface BusinessImpactSummaryProps {
  impact: BusinessImpact;
  forecast: RiskImpactAnalysisResponse['forecast'];
}

export const BusinessImpactSummary: React.FC<BusinessImpactSummaryProps> = ({
  impact,
  forecast,
}) => {
  const hasHighImpact =
    (forecast?.projectedBurnRate ?? 0) > 10 || forecast?.confidence === 'high';

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiTitle size="m">
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.riskImpact.businessImpact"
            defaultMessage="Business Impact Analysis"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      {hasHighImpact && forecast.timeToBreach && (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.riskImpact.criticalWarning"
                defaultMessage="Critical: Proactive Risk Alert"
              />
            }
            color="danger"
            iconType="warning"
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.riskImpact.warningMessage"
              defaultMessage="High-risk entity detected. Based on dependency mapping, critical SLOs may breach in {time}. Immediate action recommended."
              values={{ time: forecast.timeToBreach }}
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            title={impact?.estimatedCost || 'N/A'}
            description={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.riskImpact.estimatedCost"
                defaultMessage="Estimated Risk Cost"
              />
            }
            titleColor="danger"
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={impact?.affectedServices?.toString() ?? 'N/A'}
            description={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.riskImpact.affectedServices"
                defaultMessage="Affected Services"
              />
            }
            titleSize="m"
          />
        </EuiFlexItem>
        {impact?.affectedTransactions && (
          <EuiFlexItem>
            <EuiStat
              title={impact.affectedTransactions.toLocaleString()}
              description={
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.riskImpact.affectedTransactions"
                  defaultMessage="Potential Impacted Transactions"
                />
              }
              titleSize="m"
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiStat
            title={
              forecast?.currentBurnRate != null && forecast?.projectedBurnRate != null
                ? `${forecast.currentBurnRate.toFixed(1)}x → ${forecast.projectedBurnRate.toFixed(1)}x`
                : 'N/A'
            }
            description={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.riskImpact.burnRateForecast"
                defaultMessage="Burn Rate Forecast"
              />
            }
            titleColor="danger"
            titleSize="m"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
