/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useDashboardsStats } from '../../hooks/api/use_dashboards_stats';
import { useIndicesStats } from '../../hooks/api/use_indices_stats';
import { useStats } from '../../hooks/api/use_stats';
import { useAgentCount } from '../../hooks/api/use_agent_count';

const BASIC_METRIC_PANEL_TYPES = ['indices', 'storage', 'agentBuilder', 'discover'] as const;

type BasicMetricPanelType = (typeof BASIC_METRIC_PANEL_TYPES)[number];

interface BasicMetricPanel {
  type: BasicMetricPanelType;
  title: string;
  metric?: string | number | Array<string | undefined>;
  isLoading?: boolean;
  isError?: boolean;
}

type BasicMetricPanelProps = Omit<BasicMetricPanel, 'type'>;
const BasicMetricPanel = ({
  title,
  metric,
  isLoading = false,
  isError = false,
}: BasicMetricPanelProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiBadge
      color={euiTheme.colors.backgroundBaseSubdued}
      css={css({
        padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
      })}
    >
      <EuiText size="s">
        <EuiTextColor color="subdued">{title}</EuiTextColor>
        &nbsp;&nbsp;
        {isLoading && <EuiLoadingSpinner size="s" />}
        {!isLoading && isError && '—'}
        {!isLoading &&
          !isError &&
          (Array.isArray(metric)
            ? metric.map((m) => {
                return (m && `${m} `) ?? null;
              })
            : metric)}
      </EuiText>
    </EuiBadge>
  );
};

export const BasicMetricBadges = () => {
  const {
    data: storageStats,
    isLoading: isLoadingStorageStats,
    isError: isErrorStorageStats,
  } = useStats();
  const {
    data: indicesData,
    isLoading: isLoadingIndices,
    isError: isErrorIndicesStats,
  } = useIndicesStats();
  const {
    data: dashboardsData,
    isLoading: isLoadingDashboards,
    isError: isErrorDashboards,
  } = useDashboardsStats();
  const { tools, agents, isLoading: isLoadingAgents, isError: isErrorAgents } = useAgentCount();

  const basicPanels: Array<BasicMetricPanel> = [
    {
      type: 'indices',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.indices.title', {
        defaultMessage: 'Indices',
      }),
      metric: indicesData?.normalIndices ?? 0,
      isLoading: isLoadingIndices,
      isError: isErrorIndicesStats,
    },
    {
      type: 'storage',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.storage.title', {
        defaultMessage: 'Storage',
      }),
      metric: storageStats?.size ?? '-',
      isLoading: isLoadingStorageStats,
      isError: isErrorStorageStats,
    },
    {
      type: 'agentBuilder',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.agentBuilder.title', {
        defaultMessage: 'Agent Builder',
      }),
      metric: [
        agents !== undefined && agents !== null
          ? i18n.translate('xpack.searchHomepage.metricPanel.basic.agentBuilder.agents', {
              defaultMessage: '{agents, plural, one {# agent} other {# agents}}',
              values: {
                agents,
              },
            })
          : undefined,
        tools !== undefined && tools !== null
          ? i18n.translate('xpack.searchHomepage.metricPanel.basic.agentBuilder.tools', {
              defaultMessage: '{tools, plural, one {# tool} other {# tools}}',
              values: {
                tools,
              },
            })
          : undefined,
      ],
      isLoading: isLoadingAgents,
      isError: isErrorAgents,
    },
    {
      type: 'discover',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.discover.title', {
        defaultMessage: 'Dashboards',
      }),
      metric: dashboardsData?.totalDashboards ?? 0,
      isLoading: isLoadingDashboards,
      isError: isErrorDashboards,
    },
  ];
  return (
    <EuiFlexGroup gutterSize="s">
      {basicPanels.map((panel) => {
        return (
          <BasicMetricPanel
            title={panel.title}
            metric={panel.metric}
            key={panel.type}
            isLoading={panel.isLoading}
            isError={panel.isError}
          />
        );
      })}
    </EuiFlexGroup>
  );
};
