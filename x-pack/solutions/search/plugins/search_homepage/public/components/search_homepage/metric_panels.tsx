/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { ApplicationStart } from '@kbn/core/public';
import { WORKFLOWS_UI_SETTING_ENABLED_ID } from '../../../common';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useKibana } from '../../hooks/use_kibana';

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
  dataTestSubj: string;
  onPanelClick?: ({
    share,
    application,
  }: {
    share: SharePublicStart;
    application: ApplicationStart;
  }) => void;
}

export const METRIC_PANEL_ITEMS: Array<ComplexMetricPanel> = [
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
    onPanelClick: ({ application }) => {
      application.navigateToApp('discover');
    },
    dataTestSubj: 'searchHomepageNavLinks-discover',
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
    onPanelClick: ({ application }) => {
      application.navigateToApp('dashboards');
    },
    dataTestSubj: 'searchHomepageNavLinks-dashboards',
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
    onPanelClick: ({ application }) => {
      application.navigateToApp('agent_builder');
    },
    dataTestSubj: 'searchHomepageNavLinks-agentBuilder',
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
    onPanelClick: ({ application }) => {
      application.navigateToApp('workflows');
    },
    dataTestSubj: 'searchHomepageNavLinks-workflows',
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
    onPanelClick: ({ application }) => {
      application.navigateToApp('ml', {
        path: 'overview',
      });
    },
    dataTestSubj: 'searchHomepageNavLinks-machineLearning',
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
    onPanelClick: ({ application }) => {
      application.navigateToApp('management', {
        path: 'data/index_management',
      });
    },
    dataTestSubj: 'searchHomepageNavLinks-dataManagement',
  },
];

interface MetricPanelEmptyProps {
  panel: ComplexMetricPanel;
}

const MetricPanelEmpty = ({ panel }: MetricPanelEmptyProps) => {
  const {
    services: { share, application },
  } = useKibana();
  const assetBasePath = useAssetBasePath();
  const { euiTheme } = useEuiTheme();

  const { getImageUrl, metricTitle, metricDescription, onPanelClick, dataTestSubj } = panel;
  return (
    <EuiSplitPanel.Outer
      hasBorder
      onClick={() => onPanelClick && onPanelClick({ share, application })}
      data-test-subj={dataTestSubj}
    >
      <EuiSplitPanel.Inner
        grow
        css={css({
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          minHeight: `${euiTheme.base * 7}px`,
        })}
      >
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          justifyContent="center"
          gutterSize="s"
          css={css({ height: '100%' })}
        >
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

export const MetricPanels = () => {
  const { services } = useKibana();
  const isWorkflowsUiEnabled = services.uiSettings.get<boolean>(
    WORKFLOWS_UI_SETTING_ENABLED_ID,
    false
  );

  const panels = isWorkflowsUiEnabled
    ? METRIC_PANEL_ITEMS
    : METRIC_PANEL_ITEMS.filter((p) => p.type !== 'workflows');

  return (
    <EuiFlexGrid gutterSize="l" columns={3} data-test-subj="searchHomepageNavLinksTabGrid">
      {panels.map((panel, index) => (
        <EuiFlexItem key={panel.type + '-' + index}>
          <MetricPanelEmpty panel={panel} />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
