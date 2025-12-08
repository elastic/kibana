/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
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
  | 'dataFrameAnalytics'
  | 'alerts'
  | 'anomalies';

const MetricPanelEmpty = ({ type }: { type: MetricPanelType }) => {
  const assetBasePath = useAssetBasePath();
  const { euiTheme } = useEuiTheme();

  const METRIC_PANEL_ITEMS: Record<
    MetricPanelType,
    {
      imageUrl: string;
      metricDescription: string;
      metricTitle: string;
      createAction: () => void;
      color: string;
    }
  > = {
    discover: {
      imageUrl: `${assetBasePath}/search_lake.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.discover.desc', {
        defaultMessage:
          'Use ES|QL, data analysis tools and intuitive workflows to quickly explore your dataset.',
      }),

      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.discover.title', {
        defaultMessage: 'Discover',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBaseSubdued,
    },
    dashboards: {
      imageUrl: `${assetBasePath}/search_data_vis.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.dashboards.desc', {
        defaultMessage:
          'Mix visualizations into robust dashboards that provide views for any situational need.',
      }),

      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.dashboards.title', {
        defaultMessage: 'Dashboards',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBaseSubdued,
    },
    agents: {
      imageUrl: `${assetBasePath}/search_agents.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.agents.desc', {
        defaultMessage:
          'Using customizable workflows and agents, insights into your data are easily available.',
      }),

      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.agents.title', {
        defaultMessage: 'Agent Builder',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBaseSubdued,
    },
    anomalies: {
      imageUrl: `${assetBasePath}/search_machinelearning.svg`,

      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.anomalies.desc', {
        defaultMessage:
          'Analyze all of your Elastic data in one place by creating a dashboard and adding visualizations.',
      }),

      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.anomalies.title', {
        defaultMessage: 'Anomaly Detection',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBaseSubdued,
    },
    dataFrameAnalytics: {
      imageUrl: `${assetBasePath}/search_behavioral_analysis.svg`,
      metricDescription: i18n.translate(
        'xpack.searchHomepage.metricPanels.empty.dataFrameAnalytics.desc',
        {
          defaultMessage:
            'Train outlier detection, regression, or classification machine learning models using data frame analytics.',
        }
      ),

      metricTitle: i18n.translate(
        'xpack.searchHomepage.metricPanels.empty.dataFrameAnalytics.title',
        {
          defaultMessage: 'Data Frame Analytics',
        }
      ),
      createAction: () => {},
      color: euiTheme.colors.backgroundBaseSubdued,
    },
    alerts: {
      imageUrl: `${assetBasePath}/search_connect_visibility.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.alerts.desc', {
        defaultMessage:
          'Monitor data and get notified about significant changes or events in real time.',
      }),

      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.alerts.title', {
        defaultMessage: 'Alerts',
      }),
      createAction: () => {},
      color: euiTheme.colors.backgroundBaseSubdued,
    },
  };

  const { imageUrl, metricTitle, metricDescription, color, createAction } =
    METRIC_PANEL_ITEMS[type];
  return (
    <EuiSplitPanel.Outer hasBorder>
      <EuiSplitPanel.Inner
        css={css({
          backgroundColor: color,
          minHeight: `${euiTheme.base * 7}px`,
        })}
      >
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <div>
              <EuiImage size={euiTheme.size.xxxxl} src={imageUrl} alt="" />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner
        css={css({
          minHeight: `${euiTheme.base * 8}px`,
        })}
      >
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
      id: 'dataFrameAnalytics',
      type: 'dataFrameAnalytics',
    },
    {
      id: 'anomalies',
      type: 'anomalies',
    },
    {
      id: 'alerts',
      type: 'alerts',
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
