/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiBadge,
  EuiSpacer,
  EuiStat,
  EuiHealth,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RiskImpactEntity } from '../../../../common/entity_analytics/risk_impact/types';
import { getRiskScoreColors } from '../entity_analytics_risk_score/utils';

interface RiskEntityCardProps {
  entity: RiskImpactEntity;
}

export const RiskEntityCard: React.FC<RiskEntityCardProps> = ({ entity }) => {
  const colors = entity.riskLevel ? getRiskScoreColors(entity.riskLevel) : undefined;

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup alignItems="center" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.riskImpact.entityTitle"
                defaultMessage="Risk Entity"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {entity.riskLevel && (
            <EuiBadge color={colors?.badgeColor}>{entity.riskLevel.toUpperCase()}</EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            title={entity.name}
            description={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.riskImpact.entityName"
                defaultMessage="{type} Name"
                values={{ type: entity.type.charAt(0).toUpperCase() + entity.type.slice(1) }}
              />
            }
            titleSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={entity.riskScore?.toFixed(1) ?? 'N/A'}
            description={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.riskImpact.riskScore"
                defaultMessage="Risk Score"
              />
            }
            titleSize="s"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {entity.riskContributors && entity.riskContributors.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.riskImpact.contributors"
                defaultMessage="Risk Contributors"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {entity.riskContributors.map((contributor, index) => (
            <EuiFlexGroup key={index} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiHealth color="danger" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{contributor.category}</strong>: {contributor.alertCount} alerts (score:{' '}
                  {contributor.score.toFixed(1)})
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </>
      )}
    </EuiPanel>
  );
};
