/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiPanel,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useIndicesStats } from '../../hooks/api/use_indices_stats';
import { useDashboardsStats } from '../../hooks/api/use_dashboards_stats';
import { useAgentCount } from '../../hooks/api/use_agent_count';
import { useStats } from '../../hooks/api/use_stats';

interface MetricPanelProps {
  title: string;
  onClick?: () => void;
  metric: {
    value: number;
    detail: string;
  };
  addButtonAriaLabel: string;
  dataTestSubj: string;
}

export type MetricPanelType =
  | 'discover'
  | 'agents'
  | 'dashboards'
  | 'queryRules'
  | 'synonyms'
  | 'anomalies';

const MetricPanelEmpty = ({ type }: { type: MetricPanelType }) => {
  const assetBasePath = useAssetBasePath();
  const { euiTheme } = useEuiTheme();

  const METRIC_PANEL_ITEMS: Record<
    MetricPanelType,
    {
      imageUrl: string;
      metricDescription: string;
      createText: string;
      metricTitle: string;
      createAction: () => void;
      color: string;
    }
  > = {
    discover: {
      imageUrl: `${assetBasePath}/search_indexing_folder.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.discover.desc', {
        defaultMessage:
          'Use ES|QL, data analysis tools and intuitive workflows to quickly explore your dataset.',
      }),
      createText: i18n.translate('xpack.searchHomepage.metricPanels.empty.discover.create', {
        defaultMessage: 'Open Discover',
      }),
      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.discover.title', {
        defaultMessage: 'Explore your data',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBasePrimary,
    },
    dashboards: {
      imageUrl: `${assetBasePath}/search_observe.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.dashboards.desc', {
        defaultMessage:
          'Mix visualizations into robust dashboards that provide views for any situational need.',
      }),
      createText: i18n.translate('xpack.searchHomepage.metricPanels.empty.dashboards.create', {
        defaultMessage: 'Create a dashboard',
      }),
      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.dashboards.title', {
        defaultMessage: 'Create operational dashboards',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBaseSuccess,
    },
    agents: {
      imageUrl: `${assetBasePath}/search_agents.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.agents.desc', {
        defaultMessage:
          'Using customizable workflows and agents, insights into your data are easily available.',
      }),
      createText: i18n.translate('xpack.searchHomepage.metricPanels.empty.agents.create', {
        defaultMessage: 'Open Agent builder',
      }),
      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.agents.title', {
        defaultMessage: 'Intuitively get answers from your data',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBasePrimary,
    },
    queryRules: {
      imageUrl: `${assetBasePath}/semantic_search.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.queryRules.desc', {
        defaultMessage:
          'Enhance search experiences with custom rules to filter and prioritize results based on your business logic.',
      }),
      createText: i18n.translate('xpack.searchHomepage.metricPanels.empty.queryRules.create', {
        defaultMessage: 'Get started',
      }),
      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.queryRules.title', {
        defaultMessage: 'Query Rules',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBaseNeutral,
    },
    synonyms: {
      imageUrl: `${assetBasePath}/search_relevance.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.synonyms.desc', {
        defaultMessage: 'Improve the accuracy and comprehensiveness of your search application.',
      }),
      createText: i18n.translate('xpack.searchHomepage.metricPanels.empty.synonyms.create', {
        defaultMessage: 'Get started',
      }),
      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.synonyms.title', {
        defaultMessage: 'Synonyms',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBaseNeutral,
    },
    anomalies: {
      imageUrl: `${assetBasePath}/search_machinelearning.svg`,

      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.anomalies.desc', {
        defaultMessage:
          'Start automatically spotting anomalies hiding in your time series data and resolve issues faster.',
      }),
      createText: i18n.translate('xpack.searchHomepage.metricPanels.empty.anomalies.create', {
        defaultMessage: 'Get started',
      }),
      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.anomalies.title', {
        defaultMessage: 'Spot anomalies faster',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBasePrimary,
    },
  };

  const { imageUrl, metricTitle, metricDescription, createText, color, createAction } =
    METRIC_PANEL_ITEMS[type];
  return (
    <EuiSplitPanel.Outer hasShadow>
      <EuiSplitPanel.Inner
        css={css({
          backgroundColor: color,
        })}
      >
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <div>
              <EuiImage size={120} src={imageUrl} alt="" />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h4>{metricTitle}</h4>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              <p>{metricDescription}</p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false} css={css({ padding: euiTheme.size.s })}>
            <EuiButton
              data-test-subj="searchHomepageMetricPanelEmptyButton"
              onClick={createAction}
              color="text"
            >
              {createText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

export const MetricPanel = ({
  title,
  onClick,
  metric,
  addButtonAriaLabel,
  dataTestSubj,
}: MetricPanelProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>{title}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="info" size="m" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {onClick && (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="plusInCircle"
                  aria-label={addButtonAriaLabel}
                  data-test-subj={dataTestSubj}
                  onClick={onClick}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            css={css({ padding: `${euiTheme.size.base} 0` })}
          >
            <EuiFlexItem>
              <EuiTitle size="l">
                <h1>{metric.value}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {metric.detail}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
interface BasicMetricPanelProps {
  title: string;
  metric: string | number;
}
const BasicMetricPanel = ({ title, metric }: BasicMetricPanelProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      css={css({
        borderRight: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        '&:last-child': {
          borderRight: 'none',
        },
      })}
    >
      <EuiFlexItem>
        <EuiText color="subdued" size="xs">
          <p>{title}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText>
          <strong>{metric}</strong>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface MetricPanelsProps {
  panelType?: 'basic' | 'complex';
}
export const MetricPanels = ({ panelType = 'basic' }: MetricPanelsProps) => {
  const { data: storageStats, isLoading: isLoadingStorageStats } = useStats();
  const { data: indicesData, isLoading: isLoadingIndices } = useIndicesStats();
  const { data: dashboardsData, isLoading: isLoadingDashboards } = useDashboardsStats();
  const { tools } = useAgentCount();

  const basicPanels = [
    {
      id: 'indices',
      metricType: 'indices',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.indices.title', {
        defaultMessage: 'Indices',
      }),
      metric: isLoadingIndices ? '-' : indicesData?.normalIndices ?? 0,
    },
    {
      id: 'storage',
      metricType: 'storage',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.storage.title', {
        defaultMessage: 'Storage',
      }),
      metric: isLoadingStorageStats ? '-' : storageStats?.size ?? '-',
    },
    {
      id: 'tools',
      metricType: 'tools',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.tools.title', {
        defaultMessage: 'Tools',
      }),
      metric: tools,
    },
    {
      id: 'discover',
      metricType: 'discover',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.discover.title', {
        defaultMessage: 'Dashboards',
      }),
      metric: isLoadingDashboards ? '-' : dashboardsData?.totalDashboards ?? 0,
    },
  ];
  const complexPanels: Array<{ id: string; type: MetricPanelType }> = [
    {
      id: 'discover',
      type: 'discover',
    },
    {
      id: 'dashboards',
      type: 'dashboards',
    },
    {
      id: 'agents',
      type: 'agents',
    },
    {
      id: 'queryRules',
      type: 'queryRules',
    },
    {
      id: 'synonyms',
      type: 'synonyms',
    },
    {
      id: 'anomalies',
      type: 'anomalies',
    },
  ];

  return panelType === 'complex' ? (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {complexPanels.map((panel) => (
        <EuiFlexItem key={panel.id}>
          <MetricPanelEmpty type={panel.type} />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  ) : (
    <EuiFlexGroup>
      {basicPanels.map((panel) => {
        return <BasicMetricPanel title={panel.title} metric={panel.metric} key={panel.id} />;
      })}
    </EuiFlexGroup>
  );
};
