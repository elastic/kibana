/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPageTemplate, EuiSpacer, EuiTitle } from '@elastic/eui';
import { TrialUsageBadge } from '@kbn/shared-components';
import { ConnectToProject, useOnboardingCredentials } from '@kbn/vectordb-onboarding';
import { i18n } from '@kbn/i18n';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import { useDeploymentStats } from '../hooks/use_deployment_stats';
import { formatBytes, formatNumber } from '../utils/format';
import { HomePageBanner } from './home_page_banner';
import { HomePageStatPanel } from './home_page_stat_panel';
import { AddDataSection } from './add_data_section';
import { ChatWithYourDataSection } from './chat_with_data_section';
import { useKibana } from '../hooks/use_kibana';
import { STAT_TILE_LABELS } from '../constants';
import { useAuthenticatedUser } from '../hooks/use_authenticated_user';

export const HomePage = () => {
  const {
    services: { cloud, application, share },
  } = useKibana();
  const { user } = useAuthenticatedUser();
  const { stats, isLoading } = useDeploymentStats();
  const { elasticsearchUrl, apiKey, isLoading: isCredentialsLoading } = useOnboardingCredentials();
  const hasData = (stats.vectorDocsCount ?? 0) > 0 || (stats.indicesCount ?? 0) > 0;

  const username = user?.full_name || user?.email;

  const indexManagementLocator = useMemo(
    () => share?.url.locators.get(INDEX_MANAGEMENT_LOCATOR_ID),
    [share]
  );

  const navigateToDashboards = useCallback(() => {
    application.navigateToApp('dashboards');
  }, [application]);

  const navigateToWorkflows = useCallback(() => {
    application.navigateToApp('workflows');
  }, [application]);

  const navigateToApiKeys = useCallback(() => {
    application.navigateToApp('management', { path: '/security/api_keys' });
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
      tooltip: STAT_TILE_LABELS.vectorsTooltip,
    },
    {
      key: 'totalSize',
      label: STAT_TILE_LABELS.totalSize,
      value: formatBytes(stats.storeSizeBytes),
      isLoading,
    },
  ];

  return (
    <EuiPageTemplate restrictWidth panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              responsive={false}
              alignItems="center"
              gutterSize="s"
              data-test-subj="searchHomepageHeaderLeftsideGroup"
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    {username
                      ? i18n.translate('xpack.searchHomepage.welcome.title', {
                          defaultMessage: 'Welcome, {username}',
                          values: { username },
                        })
                      : i18n.translate('xpack.searchHomepage.welcome.title.default', {
                          defaultMessage: 'Welcome',
                        })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              {cloud?.isInTrial() && (
                <EuiFlexItem grow={false}>
                  <TrialUsageBadge cloud={cloud} />
                </EuiFlexItem>
              )}
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
              onTitleClick={() => {
                if (indexManagementLocator) {
                  indexManagementLocator.navigate({
                    page: 'index_list',
                  });
                }
              }}
              testSubj="homePageDataCard"
              metrics={dataStats}
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
                  onTitleClick={navigateToDashboards}
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
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <HomePageStatPanel
                  iconType="workflow"
                  title={i18n.translate('xpack.serverlessVectordb.home.workflowsCard.title', {
                    defaultMessage: 'Workflows',
                  })}
                  onTitleClick={navigateToWorkflows}
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
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <HomePageStatPanel
                  iconType="key"
                  title={i18n.translate('xpack.serverlessVectordb.home.apiKeysCard.title', {
                    defaultMessage: 'API Keys',
                  })}
                  onTitleClick={navigateToApiKeys}
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
