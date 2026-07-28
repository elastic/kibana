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
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiPanel,
  EuiShowFor,
  EuiSpacer,
  EuiStat,
  EuiText,
  type UseEuiTheme,
} from '@elastic/eui';
import { TrialUsageBadge, CloudLinks } from '@kbn/shared-components';
import { ConnectToProject, useOnboardingCredentials } from '@kbn/vectordb-onboarding';
import { i18n } from '@kbn/i18n';
import { useDeploymentStats } from '../hooks/use_deployment_stats';
import { formatBytes, formatNumber } from '../utils/format';
import { HomePageBanner } from './home_page_banner';
import { AddDataSection } from './add_data_section';
import { ChatWithYourDataSection } from './chat_with_data_section';
import { useKibana } from '../hooks/use_kibana';
import { STAT_TILE_LABELS } from '../constants';

const VerticalSeparatorStyle = ({ euiTheme }: UseEuiTheme) => css`
  border-left: ${euiTheme.border.thin};
  height: ${euiTheme.size.l};
`;

interface StatCardProps {
  iconType: string;
  title: string;
  onTitleClick: () => void;
  testSubj: string;
  stats: Array<{ key: string; label: string; value: string; isLoading: boolean }>;
}

const StatCard = ({ iconType, title, onTitleClick, testSubj, stats }: StatCardProps) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj={testSubj}>
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="m" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink onClick={onTitleClick}>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="arrowRight" size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiFlexGroup gutterSize="l" responsive={false}>
      {stats.map(({ key, label, value, isLoading }) => (
        <EuiFlexItem key={key}>
          <EuiStat
            title={isLoading ? <EuiLoadingSpinner size="m" /> : value}
            description={
              <EuiText size="xs" color="subdued">
                <strong>{label}</strong>
              </EuiText>
            }
            descriptionElement="div"
            titleSize="s"
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  </EuiPanel>
);

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
            <EuiPanel hasBorder paddingSize="m" data-test-subj="homePageDataCard">
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="indexMapping" size="m" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiLink onClick={navigateToIndexManagement}>
                    <EuiText size="s">
                      <strong>
                        {i18n.translate('xpack.serverlessVectordb.home.dataCard.title', {
                          defaultMessage: 'Data',
                        })}
                      </strong>
                    </EuiText>
                  </EuiLink>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="arrowRight" size="s" />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="s" />
              <EuiFlexGroup gutterSize="xl" responsive={false} wrap>
                {dataStats.map(({ key, label, value, isLoading: statIsLoading }) => (
                  <EuiFlexItem key={key}>
                    <EuiStat
                      title={statIsLoading ? <EuiLoadingSpinner size="m" /> : value}
                      description={
                        <EuiText size="xs" color="subdued">
                          <strong>{label}</strong>
                        </EuiText>
                      }
                      descriptionElement="div"
                      titleSize="s"
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          {/* Dashboards / Workflows / API Keys cards */}
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <StatCard
                  iconType="dashboardApp"
                  title={i18n.translate('xpack.serverlessVectordb.home.dashboardsCard.title', {
                    defaultMessage: 'Dashboards',
                  })}
                  onTitleClick={navigateToDashboards}
                  testSubj="homePageDashboardsCard"
                  stats={[
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
                <StatCard
                  iconType="branch"
                  title={i18n.translate('xpack.serverlessVectordb.home.workflowsCard.title', {
                    defaultMessage: 'Workflows',
                  })}
                  onTitleClick={navigateToWorkflows}
                  testSubj="homePageWorkflowsCard"
                  stats={[
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
                <StatCard
                  iconType="key"
                  title={i18n.translate('xpack.serverlessVectordb.home.apiKeysCard.title', {
                    defaultMessage: 'API Keys',
                  })}
                  onTitleClick={navigateToApiKeys}
                  testSubj="homePageApiKeysCard"
                  stats={[
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
