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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiPanel,
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

export type MetricPanelType = 'indices' | 'agents' | 'dashboards';

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
    }
  > = {
    indices: {
      imageUrl: `${assetBasePath}/search_indexing_folder.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.indices.desc', {
        defaultMessage:
          'An index is a fundamental unit of storage in Elasticsearch with documents and metadata.',
      }),
      createText: i18n.translate('xpack.searchHomepage.metricPanels.empty.indices.create', {
        defaultMessage: 'Create an index',
      }),
      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.indices.title', {
        defaultMessage: 'Indices',
      }),
      createAction: () => {},
    },
    dashboards: {
      imageUrl: `${assetBasePath}/search_analytics.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.dashboards.desc', {
        defaultMessage:
          'Dashboards are the best way to visualize and share insights from your Elasticsearch data.',
      }),
      createText: i18n.translate('xpack.searchHomepage.metricPanels.empty.dashboards.create', {
        defaultMessage: 'Create a dashboard',
      }),
      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.dashboards.title', {
        defaultMessage: 'Dashboards',
      }),
      createAction: () => {},
    },
    agents: {
      imageUrl: `${assetBasePath}/search_relevance.svg`,
      metricDescription: i18n.translate('xpack.searchHomepage.metricPanels.empty.agents.desc', {
        defaultMessage:
          'An AI layer in Elasticsearch, agents provide a framework for building agentic workflows.',
      }),
      createText: i18n.translate('xpack.searchHomepage.metricPanels.empty.agents.create', {
        defaultMessage: 'Create an agent',
      }),
      metricTitle: i18n.translate('xpack.searchHomepage.metricPanels.empty.agents.title', {
        defaultMessage: 'Agents',
      }),
      createAction: () => {},
    },
  };

  const { imageUrl, metricTitle, metricDescription, createText, createAction } =
    METRIC_PANEL_ITEMS[type];
  return (
    <EuiPanel
      color="subdued"
      hasBorder
      css={css({
        padding: `${euiTheme.size.xl} ${euiTheme.base}px`,
      })}
    >
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <div>
            <EuiImage size={68} src={imageUrl} alt="" />
          </div>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h5>{metricTitle}</h5>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText color="subdued" textAlign="center" size="s">
            <p>{metricDescription}</p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false} css={css({ padding: euiTheme.size.s })}>
          <EuiButton
            data-test-subj="searchHomepageMetricPanelEmptyButton"
            iconType="plusInCircle"
            onClick={createAction}
            color="text"
          >
            {createText}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
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
  const panels: Array<{ id: string; type: MetricPanelType }> = [
    {
      id: 'indices',
      type: 'indices',
    },
    {
      id: 'dashboards',
      type: 'dashboards',
    },
    {
      id: 'agents',
      type: 'agents',
    },
  ];

  return (
    <EuiFlexGroup gutterSize="m">
      {panels.map((panel) => (
        <EuiFlexItem key={panel.id}>
          <MetricPanelEmpty type={panel.type} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
