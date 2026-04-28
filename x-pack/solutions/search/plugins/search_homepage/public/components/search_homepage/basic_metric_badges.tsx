/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiFlexGroup, EuiText, EuiTextColor, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useDashboardsStats } from '../../hooks/api/use_dashboards_stats';
import { useIndicesStats } from '../../hooks/api/use_indices_stats';
import { useStats } from '../../hooks/api/use_stats';
import { useAgentCount } from '../../hooks/api/use_agent_count';
import { useKibana } from '../../hooks/use_kibana';

const BASIC_METRIC_PANEL_TYPES = ['indices', 'storage', 'agentBuilder', 'discover'] as const;

type BasicMetricPanelType = (typeof BASIC_METRIC_PANEL_TYPES)[number];

interface BasicMetricPanel {
  type: BasicMetricPanelType;
  title: string;
  metric?: string | number | Array<string | undefined> | undefined;
  isError?: boolean;
}

const isMetricEmpty = (metric: BasicMetricPanel['metric']): boolean => {
  if (metric === undefined) {
    return true;
  }
  if (Array.isArray(metric)) {
    return metric.every((m) => m === undefined);
  }
  return false;
};

type BasicMetricPanelProps = Omit<BasicMetricPanel, 'type'>;
const BasicMetricPanel = ({ title, metric, isError = false }: BasicMetricPanelProps) => {
  const { euiTheme } = useEuiTheme();

  if (!isError && isMetricEmpty(metric)) {
    return null;
  }

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
        {isError && '—'}
        {!isError &&
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
  const { chrome } = useKibana().services;
  const { data: storageStats, isError: isErrorStorageStats } = useStats();
  const { data: indicesData, isError: isErrorIndicesStats } = useIndicesStats();
  const { data: dashboardsData, isError: isErrorDashboards } = useDashboardsStats();
  const { tools, agents, isError: isErrorAgents } = useAgentCount();

  const hasDashboardsNavLink = chrome.navLinks.get('dashboards') !== undefined;

  const basicPanels: Array<BasicMetricPanel> = [
    {
      type: 'indices',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.indices.title', {
        defaultMessage: 'Indices',
      }),
      metric: indicesData?.normalIndices,
      isError: isErrorIndicesStats,
    },
    {
      type: 'storage',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.storage.title', {
        defaultMessage: 'Storage',
      }),
      metric: storageStats?.size,
      isError: isErrorStorageStats,
    },
    {
      type: 'agentBuilder',
      title: i18n.translate('xpack.searchHomepage.metricPanel.basic.agentBuilder.title', {
        defaultMessage: 'Agent Builder',
      }),
      metric: [
        agents != null
          ? i18n.translate('xpack.searchHomepage.metricPanel.basic.agentBuilder.agents', {
              defaultMessage: '{agents, plural, one {# agent} other {# agents}}',
              values: {
                agents,
              },
            })
          : undefined,
        tools != null
          ? i18n.translate('xpack.searchHomepage.metricPanel.basic.agentBuilder.tools', {
              defaultMessage: '{tools, plural, one {# tool} other {# tools}}',
              values: {
                tools,
              },
            })
          : undefined,
      ],
      isError: isErrorAgents,
    },
    ...(hasDashboardsNavLink
      ? [
          {
            type: 'discover' as const,
            title: i18n.translate('xpack.searchHomepage.metricPanel.basic.discover.title', {
              defaultMessage: 'Dashboards',
            }),
            metric: dashboardsData?.totalDashboards,
            isError: isErrorDashboards,
          },
        ]
      : []),
  ];
  return (
    <EuiFlexGroup gutterSize="s">
      {basicPanels.map((panel) => {
        return (
          <BasicMetricPanel
            title={panel.title}
            metric={panel.metric}
            key={panel.type}
            isError={panel.isError}
          />
        );
      })}
    </EuiFlexGroup>
  );
};
