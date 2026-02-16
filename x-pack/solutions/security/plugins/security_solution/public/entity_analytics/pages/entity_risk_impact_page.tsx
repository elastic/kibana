/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '../../app/types';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { useRiskImpactEntities } from '../api/hooks/use_risk_impact_analysis';
import { RiskImpactTable, type RiskImpactEntity } from '../components/risk_impact_table';
import { RiskImpactFlyout } from '../components/risk_impact_flyout';

export const EntityRiskImpactPage: React.FC = () => {
  const { data: entities, isLoading, error } = useRiskImpactEntities();
  const [selectedEntity, setSelectedEntity] = useState<RiskImpactEntity | null>(null);

  const handleEntityClick = useCallback((entity: RiskImpactEntity) => {
    setSelectedEntity(entity);
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setSelectedEntity(null);
  }, []);

  return (
    <>
      <SecuritySolutionPageWrapper>
        <HeaderPage
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityRiskImpact.pageTitle"
              defaultMessage="Proactive Risk Impact Analysis"
            />
          }
          subtitle={
            <FormattedMessage
              id="xpack.securitySolution.entityRiskImpact.pageSubtitle"
              defaultMessage="Identify high-risk entities and their potential impact on downstream services and SLOs"
            />
          }
        />

        <EuiSpacer size="l" />

        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityRiskImpact.betaCallout.title"
              defaultMessage="Proof of Concept Feature"
            />
          }
          color="primary"
          iconType="beaker"
        >
          <p>
            <FormattedMessage
              id="xpack.securitySolution.entityRiskImpact.betaCallout.description"
              defaultMessage="This feature demonstrates proactive risk analysis by correlating entity risk scores with downstream service dependencies and SLO impact. Currently showing mock data for demonstration purposes."
            />
          </p>
        </EuiCallOut>

        <EuiSpacer size="l" />

        <EuiPanel hasBorder>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.entityRiskImpact.tableTitle"
                    defaultMessage="High-Risk Entities"
                  />
                </h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.securitySolution.entityRiskImpact.tableDescription"
                  defaultMessage="Entities sorted by risk score. Click on any entity to view detailed impact analysis."
                />
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem>
              {isLoading && (
                <EuiFlexGroup justifyContent="center" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="xl" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}

              {error && (
                <EuiEmptyPrompt
                  iconType="warning"
                  color="danger"
                  title={
                    <h3>
                      <FormattedMessage
                        id="xpack.securitySolution.entityRiskImpact.errorTitle"
                        defaultMessage="Failed to load risk impact data"
                      />
                    </h3>
                  }
                  body={<p>{error.message}</p>}
                />
              )}

              {entities && !isLoading && !error && (
                <RiskImpactTable
                  entities={entities}
                  loading={isLoading}
                  onEntityClick={handleEntityClick}
                />
              )}

              {entities && entities.length === 0 && !isLoading && (
                <EuiEmptyPrompt
                  iconType="search"
                  title={
                    <h3>
                      <FormattedMessage
                        id="xpack.securitySolution.entityRiskImpact.noDataTitle"
                        defaultMessage="No high-risk entities detected"
                      />
                    </h3>
                  }
                  body={
                    <p>
                      <FormattedMessage
                        id="xpack.securitySolution.entityRiskImpact.noDataBody"
                        defaultMessage="All monitored entities are operating within normal risk parameters."
                      />
                    </p>
                  }
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </SecuritySolutionPageWrapper>

      {selectedEntity && (
        <RiskImpactFlyout
          entityName={selectedEntity.entityName}
          entityType={selectedEntity.entityType}
          onClose={handleCloseFlyout}
        />
      )}

      <SpyRoute pageName={SecurityPageName.entityAnalyticsRiskImpact} />
    </>
  );
};

EntityRiskImpactPage.displayName = 'EntityRiskImpactPage';
