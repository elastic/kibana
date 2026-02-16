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
  EuiIcon,
  EuiText,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DependencyRelation } from '../../../../common/entity_analytics/risk_impact/types';
import { getRiskScoreColors } from '../entity_analytics_risk_score/utils';

interface DependencyChainVizProps {
  chain: DependencyRelation[];
}

export const DependencyChainViz: React.FC<DependencyChainVizProps> = ({ chain }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiTitle size="m">
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.riskImpact.dependencyChain"
            defaultMessage="Dependency Chain"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {chain && chain.length > 0 ? (
        <EuiFlexGroup direction="column" gutterSize="m">
          {chain.map((relation, index) => {
            const colors = relation.entity?.riskLevel
              ? getRiskScoreColors(relation.entity.riskLevel, euiTheme)
              : undefined;

            return (
              <React.Fragment key={index}>
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false}>
                    <EuiFlexItem grow={false}>
                      <EuiPanel color="subdued" paddingSize="s">
                        <EuiText size="s">
                          <strong>{relation.from}</strong>
                        </EuiText>
                      </EuiPanel>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="arrowRight" size="m" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {relation.type}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="arrowRight" size="m" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiPanel
                        color={relation.entity?.riskLevel ? 'warning' : 'subdued'}
                        paddingSize="s"
                      >
                        <EuiFlexGroup gutterSize="xs" alignItems="center">
                          <EuiFlexItem grow={false}>
                            <EuiText size="s">
                              <strong>{relation.to}</strong>
                            </EuiText>
                          </EuiFlexItem>
                          {relation.entity?.riskLevel && (
                            <EuiFlexItem grow={false}>
                              <EuiBadge
                                color={colors?.background}
                                style={{
                                  color: colors?.text,
                                }}
                              >
                                Risk: {relation.entity.riskScore?.toFixed(0)}
                              </EuiBadge>
                            </EuiFlexItem>
                          )}
                        </EuiFlexGroup>
                      </EuiPanel>
                    </EuiFlexItem>
                    {relation.affectedSLOs && relation.affectedSLOs.length > 0 && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="danger">
                          {relation.affectedSLOs.length} SLO
                          {relation.affectedSLOs.length > 1 ? 's' : ''} affected
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </React.Fragment>
            );
          })}
        </EuiFlexGroup>
      ) : (
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.riskImpact.noDependencies"
            defaultMessage="No dependency chain detected"
          />
        </EuiText>
      )}
    </EuiPanel>
  );
};
