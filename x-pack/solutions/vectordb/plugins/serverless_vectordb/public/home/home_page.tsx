/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiShowFor,
  EuiSpacer,
  type UseEuiTheme,
} from '@elastic/eui';
import { TrialUsageBadge, CloudLinks } from '@kbn/shared-components';
import { ConnectToProject, useOnboardingCredentials } from '@kbn/vectordb-onboarding';
import { i18n } from '@kbn/i18n';
import { useDeploymentStats } from '../hooks/use_deployment_stats';
import { formatBytes, formatNumber } from '../utils/format';
import { HomePageBanner } from './home_page_banner';
import { HomePageStatPanel } from './home_page_stat_panel';
import { AddDataSection } from './add_data_section';
import { ChatWithYourDataSection } from './chat_with_data_section';
import { useKibana } from '../hooks/use_kibana';
import { STAT_TILE_LABELS } from '../constants';

const VerticalSeparatorStyle = ({ euiTheme }: UseEuiTheme) => css`
  border-left: ${euiTheme.border.thin};
  height: ${euiTheme.size.l};
`;

export const HomePage = () => {
  const {
    services: { cloud, application, share },
  } = useKibana();
  const { stats, isLoading } = useDeploymentStats();
  const { elasticsearchUrl, apiKey, isLoading: isCredentialsLoading } = useOnboardingCredentials();
  const hasData = (stats.vectorDocsCount ?? 0) > 0 || (stats.indicesCount ?? 0) > 0;

  const navigateToIndexManagement = useCallback(async () => {
    const locator = share.url.locators.get('SEARCH_INDEX_MANAGEMENT_LOCATOR_ID');
    if (locator) await locator.navigate({ page: 'index_list' });
  }, [share]);

  const navigateToDashboards = useCallback(() => {
    application.navigateToApp('dashboards');
  }, [application]);

  const navigateToCreateDashboard = useCallback(() => {
    application.navigateToApp('dashboards', { path: '#/create' });
  }, [application]);

  const navigateToWorkflows = useCallback(() => {
    application.navigateToApp('workflows');
  }, [application]);

  const navigateToCreateWorkflow = useCallback(() => {
    application.navigateToApp('workflows', { path: '/create' });
  }, [application]);

  const navigateToApiKeys = useCallback(() => {
    application.navigateToApp('management', { path: '/security/api_keys' });
  }, [application]);

  const navigateToCreateApiKey = useCallback(() => {
    application.navigateToApp('management', { path: '/security/api_keys/create' });
  }, [application]);

  const dataStats = [
    {
      key: 'totalIndices',
      label: STAT_TILE_LABELS.totalIndices,
      value: formatNumber(stats.indicesCount),
      isLoading,
    },
    {
      key: 'documents',
      label: STAT_TILE_LABELS.documents,
      value: formatNumber(stats.documentsCount),
      isLoading,
    },
    {
      key: 'vectors',
      label: STAT_TILE_LABELS.vectors,
      value: formatNumber(stats.vectorDocsCount),
      isLoading,
    },
    {
      key: 'totalSize',
      label: STAT_TILE_LABELS.totalSize,
      value: formatBytes(stats.storeSizeBytes),
      isLoading,
    },
    {
      key: 'modelUsage',
      label: STAT_TILE_LABELS.modelUsage,
      value: formatNumber(stats.modelUsageCount),
      isLoading,
    },
  ];

  return (
    <EuiPageTemplate restrictWidth panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              {cloud?.isInTrial() && (
                <>
                  <EuiFlexItem grow={false}>
                    <TrialUsageBadge cloud={cloud} />
                  </EuiFlexItem>
                  <EuiShowFor sizes={['m', 'l', 'xl']}>
                    <EuiFlexItem grow={false}>
                      <span css={VerticalSeparatorStyle} />
                    </EuiFlexItem>
                  </EuiShowFor>
                </>
              )}
              <EuiShowFor sizes={['m', 'l', 'xl']}>
                <EuiFlexItem grow={false}>
                  <CloudLinks cloud={cloud} CloudBaseOnly />
                </EuiFlexItem>
              </EuiShowFor>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConnectToProject
              elasticsearchUrl={elasticsearchUrl}
              apiKey={apiKey}
              isLoading={isCredentialsLoading}
              showLabel={false}
              isCompact
              telemetryPage="homePage"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup gutterSize="l" direction="column">
          <EuiFlexItem>
            <HomePageBanner hasData={hasData} isLoading={isLoading} />
          </EuiFlexItem>

          {/* Data card */}
          <EuiFlexItem>
            <HomePageStatPanel
              iconType="database"
              title={i18n.translate('xpack.serverlessVectordb.home.dataCard.title', {
                defaultMessage: 'Data',
              })}
              testSubj="homePageDataCard"
              metrics={dataStats}
              actions={[
                {
                  key: 'viewIndices',
                  iconType: 'indexMapping',
                  label: i18n.translate('xpack.serverlessVectordb.home.dataCard.viewIndices', {
                    defaultMessage: 'View indices',
                  }),
                  onClick: navigateToIndexManagement,
                  testSubj: 'homePageDataCardViewIndices',
                  telemetryId: 'serverlessVectordb-home-dataCard-viewIndices',
                },
              ]}
            />
          </EuiFlexItem>

          {/* Dashboards / Workflows / API Keys cards */}
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <HomePageStatPanel
                  iconType="productDashboard"
                  title={i18n.translate('xpack.serverlessVectordb.home.dashboardsCard.title', {
                    defaultMessage: 'Dashboards',
                  })}
                  testSubj="homePageDashboardsCard"
                  metrics={[
                    {
                      key: 'dashboardsTotal',
                      label: STAT_TILE_LABELS.dashboardsTotal,
                      value: formatNumber(stats.dashboardsCount),
                      isLoading,
                    },
                    {
                      key: 'dashboardsStarred',
                      label: STAT_TILE_LABELS.dashboardsStarred,
                      value: formatNumber(stats.starredDashboardsCount),
                      isLoading,
                    },
                  ]}
                  actions={[
                    {
                      key: 'createDashboard',
                      iconType: 'plusInCircle',
                      label: i18n.translate('xpack.serverlessVectordb.home.dashboardsCard.createDashboard', {
                        defaultMessage: 'Create a dashboard',
                      }),
                      onClick: navigateToCreateDashboard,
                      testSubj: 'homePageDashboardsCardCreateDashboard',
                      telemetryId: 'serverlessVectordb-home-dashboardsCard-createDashboard',
                    },
                    {
                      key: 'manageDashboards',
                      iconType: 'gear',
                      label: i18n.translate('xpack.serverlessVectordb.home.dashboardsCard.manageDashboards', {
                        defaultMessage: 'Manage dashboards',
                      }),
                      onClick: navigateToDashboards,
                      testSubj: 'homePageDashboardsCardManageDashboards',
                      telemetryId: 'serverlessVectordb-home-dashboardsCard-manageDashboards',
                    },
                  ]}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <HomePageStatPanel
                  iconType="workflow"
                  title={i18n.translate('xpack.serverlessVectordb.home.workflowsCard.title', {
                    defaultMessage: 'Workflows',
                  })}
                  testSubj="homePageWorkflowsCard"
                  metrics={[
                    {
                      key: 'workflowsTotal',
                      label: STAT_TILE_LABELS.workflowsTotal,
                      value: formatNumber(stats.workflowsCount),
                      isLoading,
                    },
                    {
                      key: 'workflowsRunning',
                      label: STAT_TILE_LABELS.workflowsRunning,
                      value: formatNumber(stats.workflowsRunningCount),
                      isLoading,
                    },
                  ]}
                  actions={[
                    {
                      key: 'createWorkflow',
                      iconType: 'plusInCircle',
                      label: i18n.translate('xpack.serverlessVectordb.home.workflowsCard.createWorkflow', {
                        defaultMessage: 'Create a workflow',
                      }),
                      onClick: navigateToCreateWorkflow,
                      testSubj: 'homePageWorkflowsCardCreateWorkflow',
                      telemetryId: 'serverlessVectordb-home-workflowsCard-createWorkflow',
                    },
                    {
                      key: 'manageWorkflows',
                      iconType: 'gear',
                      label: i18n.translate('xpack.serverlessVectordb.home.workflowsCard.manageWorkflows', {
                        defaultMessage: 'Manage workflows',
                      }),
                      onClick: navigateToWorkflows,
                      testSubj: 'homePageWorkflowsCardManageWorkflows',
                      telemetryId: 'serverlessVectordb-home-workflowsCard-manageWorkflows',
                    },
                  ]}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <HomePageStatPanel
                  iconType="key"
                  title={i18n.translate('xpack.serverlessVectordb.home.apiKeysCard.title', {
                    defaultMessage: 'API Keys',
                  })}
                  testSubj="homePageApiKeysCard"
                  metrics={[
                    {
                      key: 'apiKeysTotal',
                      label: STAT_TILE_LABELS.apiKeysTotal,
                      value: formatNumber(stats.apiKeysTotal),
                      isLoading,
                    },
                    {
                      key: 'apiKeysExpiring',
                      label: STAT_TILE_LABELS.apiKeysExpiring,
                      value: formatNumber(stats.apiKeysExpiring),
                      isLoading,
                    },
                  ]}
                  actions={[
                    {
                      key: 'createApiKey',
                      iconType: 'plusInCircle',
                      label: i18n.translate('xpack.serverlessVectordb.home.apiKeysCard.createApiKey', {
                        defaultMessage: 'Create an API key',
                      }),
                      onClick: navigateToCreateApiKey,
                      testSubj: 'homePageApiKeysCardCreateApiKey',
                      telemetryId: 'serverlessVectordb-home-apiKeysCard-createApiKey',
                    },
                    {
                      key: 'manageApiKeys',
                      iconType: 'gear',
                      label: i18n.translate('xpack.serverlessVectordb.home.apiKeysCard.manageApiKeys', {
                        defaultMessage: 'Manage API keys',
                      }),
                      onClick: navigateToApiKeys,
                      testSubj: 'homePageApiKeysCardManageApiKeys',
                      telemetryId: 'serverlessVectordb-home-apiKeysCard-manageApiKeys',
                    },
                  ]}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiSpacer size="s" />

          {/* Add data / Chat with your data */}
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem>
                <AddDataSection />
              </EuiFlexItem>
              <EuiFlexItem>
                <ChatWithYourDataSection />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
