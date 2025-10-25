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
} from '@elastic/eui';

interface MetricPanelProps {
  title: string;
  onClick: () => void;
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
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="plusInCircle"
                aria-label={addButtonAriaLabel}
                data-test-subj={dataTestSubj}
                onClick={onClick}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiTitle size="l">
                <h2>{metric.value}</h2>
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
  const panels = [
    {
      id: 'panel1',
      title: i18n.translate('xpack.searchHomepage.metrics.panel1.title', {
        defaultMessage: 'Panel 1',
      }),
      onClick: () => {},
      metric: {
        value: 0,
        detail: i18n.translate('xpack.searchHomepage.metrics.panel1.detail', {
          defaultMessage: 'Metric detail',
        }),
      },
      addButtonAriaLabel: i18n.translate('xpack.searchHomepage.metrics.panel1.add', {
        defaultMessage: 'Add',
      }),
      dataTestSubj: 'search-homepage-panel1-add-button',
    },
    {
      id: 'panel2',
      title: i18n.translate('xpack.searchHomepage.metrics.panel2.title', {
        defaultMessage: 'Panel 2',
      }),
      onClick: () => {},
      metric: {
        value: 0,
        detail: i18n.translate('xpack.searchHomepage.metrics.panel2.detail', {
          defaultMessage: 'Metric detail',
        }),
      },
      addButtonAriaLabel: i18n.translate('xpack.searchHomepage.metrics.panel2.add', {
        defaultMessage: 'Add',
      }),
      dataTestSubj: 'search-homepage-panel2-add-button',
    },
    {
      id: 'panel3',
      title: i18n.translate('xpack.searchHomepage.metrics.panel3.title', {
        defaultMessage: 'Panel 3',
      }),
      onClick: () => {},
      metric: {
        value: 0,
        detail: i18n.translate('xpack.searchHomepage.metrics.panel3.detail', {
          defaultMessage: 'Metric detail',
        }),
      },
      addButtonAriaLabel: i18n.translate('xpack.searchHomepage.metrics.panel3.add', {
        defaultMessage: 'Add',
      }),
      dataTestSubj: 'search-homepage-panel3-add-button',
    },
    {
      id: 'panel4',
      title: i18n.translate('xpack.searchHomepage.metrics.panel4.title', {
        defaultMessage: 'Panel 4',
      }),
      onClick: () => {},
      metric: {
        value: 0,
        detail: i18n.translate('xpack.searchHomepage.metrics.panel4.detail', {
          defaultMessage: 'Metric detail',
        }),
      },
      addButtonAriaLabel: i18n.translate('xpack.searchHomepage.metrics.panel4.add', {
        defaultMessage: 'Add',
      }),
      dataTestSubj: 'search-homepage-panel4-add-button',
    },
  ];

  return (
    <EuiFlexGroup gutterSize="m">
      {panels.map((panel) => (
        <EuiFlexItem key={panel.id}>
          <MetricPanel
            title={panel.title}
            onClick={panel.onClick}
            metric={panel.metric}
            addButtonAriaLabel={panel.addButtonAriaLabel}
            dataTestSubj={panel.dataTestSubj}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
