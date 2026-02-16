/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRiskImpactAnalysis } from '../../api/hooks/use_risk_impact_analysis';
import { RiskEntityCard } from '../risk_impact_analysis/risk_entity_card';
import { ImpactedSLOsPanel } from '../risk_impact_analysis/impacted_slos_panel';
import { DependencyChainViz } from '../risk_impact_analysis/dependency_chain_viz';
import { BusinessImpactSummary } from '../risk_impact_analysis/business_impact_summary';

interface RiskImpactFlyoutProps {
  entityName: string;
  entityType: 'service' | 'host' | 'user';
  onClose: () => void;
}

export const RiskImpactFlyout: React.FC<RiskImpactFlyoutProps> = ({
  entityName,
  entityType,
  onClose,
}) => {
  const { data, loading, error } = useRiskImpactAnalysis(entityType, entityName);

  return (
    <EuiFlyout onClose={onClose} size="l" ownFocus data-test-subj="risk-impact-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon type={getEntityIcon(entityType)} size="xl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.riskImpact.flyout.title"
                  defaultMessage="Risk Impact Analysis: {entityName}"
                  values={{ entityName }}
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{entityType.toUpperCase()}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {loading && (
          <EuiEmptyPrompt
            icon={<EuiLoadingSpinner size="xl" />}
            title={
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.riskImpact.flyout.loading"
                  defaultMessage="Loading risk impact analysis..."
                />
              </h3>
            }
          />
        )}

        {error && (
          <EuiEmptyPrompt
            iconType="warning"
            color="danger"
            title={
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.riskImpact.flyout.error"
                  defaultMessage="Failed to load risk impact data"
                />
              </h3>
            }
            body={<p>{error.message}</p>}
          />
        )}

        {data && !loading && !error && (
          <>
            <RiskEntityCard entity={data.entity} />
            <EuiSpacer size="l" />

            <ImpactedSLOsPanel slos={data.impactedSLOs} />
            <EuiSpacer size="l" />

            <DependencyChainViz chain={data.dependencyChain} />
            <EuiSpacer size="l" />

            <BusinessImpactSummary impact={data.businessImpact} forecast={data.forecast} />
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const getEntityIcon = (entityType: string): string => {
  switch (entityType) {
    case 'service':
      return 'cloudDrizzle';
    case 'host':
      return 'storage';
    case 'user':
      return 'user';
    default:
      return 'questionInCircle';
  }
};
