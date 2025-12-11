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

const PANEL_TYPES = [
  'discover',
  'dashboards',
  'agentBuilder',
  'workflows',
  'machineLearning',
  'dataManagement',
] as const;

export type MetricPanelType = (typeof PANEL_TYPES)[number];

export interface ComplexMetricPanel {
  getImageUrl: (assetBasePath: string) => string;
  metricDescription: string;
  metricTitle: string;
  type: MetricPanelType;
}

const METRIC_PANEL_ITEMS: Array<ComplexMetricPanel> = [
  {
    getImageUrl: (assetBasePath: string) => `${assetBasePath}/search_lake.svg`,
    metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.discover.desc', {
      defaultMessage:
        'Search and filter documents, analyze fields, visualize patterns, and save findings for later.',
    }),

    metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.discover.title', {
      defaultMessage: 'Discover',
    }),
    type: 'discover',
  },
  {
    getImageUrl: (assetBasePath: string) => `${assetBasePath}/search_data_vis.svg`,
    metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.dashboards.desc', {
      defaultMessage:
        'Analyze all of your Elastic data in one place by creating a dashboard and adding visualizations.',
    }),

    metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.dashboards.title', {
      defaultMessage: 'Dashboards',
    }),
    type: 'dashboards',
  },
  {
    getImageUrl: (assetBasePath: string) => `${assetBasePath}/search_agents.svg`,
    metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.agents.desc', {
      defaultMessage:
        'Utilize AI-powered capabilities to build and interact with agents alongside your Elasticsearch data.',
    }),

    metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.agents.title', {
      defaultMessage: 'Agent Builder',
    }),
    type: 'agentBuilder',
  },

  {
    type: 'workflows' as const,
    getImageUrl: (assetBasePath: string) => `${assetBasePath}/search_relevance.svg`,
    metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.workflows.desc', {
      defaultMessage:
        'Create intelligent workflows that turn Elastic insights into automated actions across your entire tech stack.',
    }),
    metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.workflow.title', {
      defaultMessage: 'Workflows',
    }),
  },
  {
    type: 'machineLearning',
    getImageUrl: (assetBasePath: string) => `${assetBasePath}/search_machinelearning.svg`,

    metricDescription: i18n.translate(
      'xpack.searchHomepage.metricPanels.empty.machineLearning.desc',
      {
        defaultMessage:
          'Analyze and visualize your data to generate models for determining patterns of behavior.',
      }
    ),
    metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.machineLearning.title', {
      defaultMessage: 'Machine Learning',
    }),
  },
  {
    type: 'dataManagement',
    getImageUrl: (assetBasePath: string) => `${assetBasePath}/search_indexing_folder.svg`,
    metricDescription: i18n.translate(
      'xpack.searchHomepage.metricPanels.empty.dataManagement.desc',
      {
        defaultMessage:
          'Manage your Elasticsearch indices, ingest pipelines and search relevance tooling.',
      }
    ),

    metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.dataManagement.title', {
      defaultMessage: 'Data Management',
    }),
  },
];

interface MetricPanelEmptyProps {
  panel: ComplexMetricPanel;
}

const MetricPanelEmpty = ({ panel }: MetricPanelEmptyProps) => {
  const assetBasePath = useAssetBasePath();
  const { euiTheme } = useEuiTheme();

  const { getImageUrl, metricTitle, metricDescription } = panel;
  return (
    <EuiSplitPanel.Outer hasBorder>
      <EuiSplitPanel.Inner
        css={css({
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          minHeight: `${euiTheme.base * 7}px`,
        })}
      >
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <div>
              <EuiImage size={euiTheme.size.xxxxl} src={getImageUrl(assetBasePath)} alt="" />
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

export const MetricPanels = () => {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {METRIC_PANEL_ITEMS.map((panel, index) => (
        <EuiFlexItem key={panel.type + '-' + index}>
          <MetricPanelEmpty panel={panel} />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
