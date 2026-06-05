/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiPanel,
  EuiShowFor,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTextColor,
  EuiTitle,
  type UseEuiTheme,
} from '@elastic/eui';
import { TrialUsageBadge, CloudLinks } from '@kbn/shared-components';
import { ConnectToProject, useOnboardingCredentials } from '@kbn/vectordb-onboarding';
import { i18n } from '@kbn/i18n';
import { formatBytes, formatNumber, useDeploymentStats } from '../hooks/use_deployment_stats';
import { HomePageBanner } from './home_page_banner';
import { DocumentationQuickLinks } from './documentation_quick_links';
import { useKibana } from '../hooks/use_kibana';
import { STAT_TILE_LABELS } from '../constants';

interface StatTileProps {
  label: string;
  value: string;
  isLoading: boolean;
}

const VerticalSeparatorStyle = ({ euiTheme }: UseEuiTheme) => css`
  border-left: ${euiTheme.border.thin};
  height: ${euiTheme.size.l};
`;

const StatTile = ({ label, value, isLoading }: StatTileProps) => (
  <EuiPanel hasBorder paddingSize="m">
    <EuiStat
      title={isLoading ? <EuiLoadingSpinner size="m" /> : value}
      description={
        <>
          <EuiText size="xs" color="subdued">
            <strong>{label}</strong>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      }
      descriptionElement="div"
      titleSize="m"
    />
  </EuiPanel>
);

export const HomePage = () => {
  const {
    services: { cloud },
  } = useKibana();
  const { stats, isLoading } = useDeploymentStats();
  const { elasticsearchUrl, apiKey, isLoading: isCredentialsLoading } = useOnboardingCredentials();
  const hasData = (stats.vectorDocsCount ?? 0) > 0 || (stats.indicesCount ?? 0) > 0;

  const statTiles = [
    {
      key: 'indices',
      label: STAT_TILE_LABELS.indices,
      value: formatNumber(stats.indicesCount),
    },
    {
      key: 'vectors',
      label: STAT_TILE_LABELS.vectors,
      value: formatNumber(stats.vectorDocsCount),
    },
    {
      key: 'storage',
      label: STAT_TILE_LABELS.storage,
      value: formatBytes(stats.storeSizeBytes),
    },
    {
      key: 'dashboards',
      label: STAT_TILE_LABELS.dashboards,
      value: formatNumber(stats.dashboardsCount),
    },
    {
      key: 'agents',
      label: STAT_TILE_LABELS.agents,
      value: formatNumber(stats.agentsCount),
    },
    {
      key: 'workflows',
      label: STAT_TILE_LABELS.workflows,
      value: formatNumber(stats.workflowsCount),
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
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="l" direction="column">
          <EuiFlexItem>
            <HomePageBanner hasData={hasData} isLoading={isLoading} />
          </EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiFlexItem>
            <EuiTitle size="xxxs">
              <h2>
                <EuiTextColor color="subdued">
                  {i18n.translate('xpack.serverlessVectordb.home.stats.heading', {
                    defaultMessage: 'Your vector database overview',
                  })}
                </EuiTextColor>
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGrid columns={3} gutterSize="m">
              {statTiles.map(({ key, label, value }) => (
                <StatTile key={key} label={label} value={value} isLoading={isLoading} />
              ))}
            </EuiFlexGrid>
          </EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiFlexItem>
            <DocumentationQuickLinks />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
