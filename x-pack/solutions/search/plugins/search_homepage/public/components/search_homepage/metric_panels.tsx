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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useIndicesStats } from '../../hooks/api/use_indices_stats';
import { useDashboardsStats } from '../../hooks/api/use_dashboards_stats';
import { useDataViewsStats } from '../../hooks/api/use_data_views_stats';

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

const MetricPanel = ({
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

export const MetricPanels = () => {
  const { data: indexStats } = useIndicesStats();
  const { data: dataViewStats } = useDataViewsStats();
  const { data: dashboardStats } = useDashboardsStats();

  const panels: Array<MetricPanelProps & { id: string }> = [
    {
      id: 'dashboardPanel',
      title: i18n.translate('xpack.searchHomepage.metrics.dashboards.title', {
        defaultMessage: 'Dashboards',
      }),
      metric: {
        value: dashboardStats?.totalDashboards ?? 0,
        detail: i18n.translate('xpack.searchHomepage.metrics.dashboards.detail', {
          defaultMessage: 'Dashboard count',
        }),
      },
      addButtonAriaLabel: i18n.translate('xpack.searchHomepage.metrics.dashboards.add', {
        defaultMessage: 'Create new dashboard',
      }),
      dataTestSubj: 'search-homepage-dashboards-add-button',
    },
    {
      id: 'dataViewPanel',
      title: i18n.translate('xpack.searchHomepage.metrics.dataViewPanel.title', {
        defaultMessage: 'Data Views',
      }),
      metric: {
        value: dataViewStats?.userDataViews ?? 0,
        detail: i18n.translate('xpack.searchHomepage.metrics.dataViewPanel.detail', {
          defaultMessage: 'Data view count',
        }),
      },
      addButtonAriaLabel: i18n.translate('xpack.searchHomepage.metrics.dataViewPanel.add', {
        defaultMessage: 'Create new data view',
      }),
      dataTestSubj: 'search-homepage-dataViewPanel-add-button',
    },
    {
      id: 'panel3',
      title: i18n.translate('xpack.searchHomepage.metrics.indices.title', {
        defaultMessage: 'Indices',
      }),
      metric: {
        value: indexStats?.normalIndices ?? 0,
        detail: i18n.translate('xpack.searchHomepage.metrics.indices.detail', {
          defaultMessage: 'Index count',
        }),
      },
      addButtonAriaLabel: i18n.translate('xpack.searchHomepage.metrics.indices.add', {
        defaultMessage: 'Create new index',
      }),
      dataTestSubj: 'search-homepage-indices-add-button',
    },
  ];

  return (
    <EuiFlexGroup gutterSize="m">
      {panels.map((panel) => (
        <EuiFlexItem key={panel.id}>
          <MetricPanel
            title={panel.title}
            onClick={panel?.onClick}
            metric={panel.metric}
            addButtonAriaLabel={panel.addButtonAriaLabel}
            dataTestSubj={panel.dataTestSubj}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
