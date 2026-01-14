/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiPopover,
  EuiContextMenu,
  useEuiTheme,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ClusterHealthPanelProps {
  height?: number;
}

export const ClusterHealthPanel: React.FC<ClusterHealthPanelProps> = ({ height = 250 }) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);

  // Format the current date for the footer
  const formatDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    };
    return now.toLocaleDateString('en-US', options);
  };

  const contextMenuPanels = [
    {
      id: 0,
      items: [
        {
          name: i18n.translate('xpack.kubernetesPoc.clusterHealthPanel.refreshLabel', {
            defaultMessage: 'Refresh',
          }),
          icon: 'refresh',
          onClick: closePopover,
        },
        {
          name: i18n.translate('xpack.kubernetesPoc.clusterHealthPanel.settingsLabel', {
            defaultMessage: 'Settings',
          }),
          icon: 'gear',
          onClick: closePopover,
        },
      ],
    },
  ];

  const optionsButton = (
    <EuiButtonEmpty
      iconType="boxesVertical"
      onClick={togglePopover}
      aria-label={i18n.translate('xpack.kubernetesPoc.clusterHealthPanel.optionsAriaLabel', {
        defaultMessage: 'Options',
      })}
      size="xs"
      color="text"
      css={{ minWidth: 'auto', minBlockSize: 'auto' }}
      data-test-subj="clusterHealthPanelOptionsButton"
    />
  );

  return (
    <div
      css={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: `${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.m}`,
        background: `linear-gradient(135deg, ${euiTheme.colors.lightestShade} 0%, rgba(125, 107, 255, 0.08) 50%, rgba(54, 162, 235, 0.06) 100%)`,
        borderRadius: euiTheme.border.radius.medium,
      }}
    >
      {/* Header */}
      <EuiSpacer size="s" />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="none"
        responsive={false}
        css={{ flexGrow: 0 }}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="sparkles" size="m" color="primary" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>
                {i18n.translate('xpack.kubernetesPoc.clusterHealthPanel.title', {
                  defaultMessage: 'Cluster health',
                })}
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={optionsButton}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downRight"
          >
            <EuiContextMenu initialPanelId={0} panels={contextMenuPanels} size="s" />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiHorizontalRule
        margin="none"
        style={{ marginTop: euiTheme.size.xs, marginBottom: euiTheme.size.xs }}
      />

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <EuiText size="s" color="default">
          {i18n.translate('xpack.kubernetesPoc.clusterHealthPanel.description', {
            defaultMessage:
              'The cluster is running smoothly, with most workloads healthy and control plane components responding normally. Two worker nodes show increased memory pressure, and CPU usage is rising in the production namespace. Pod restarts and network latency remain low, and no critical alerts were triggered in the last hour. Overall, capacity is sufficient but worth monitoring.',
          })}
        </EuiText>
      </div>

      {/* Footer */}
      <div
        style={{
          paddingTop: euiTheme.size.s,
          marginTop: 'auto',
          flexShrink: 0,
        }}
      >
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.kubernetesPoc.clusterHealthPanel.generatedOn', {
                defaultMessage: 'Generated on {date}',
                values: { date: formatDate() },
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="discuss"
              size="xs"
              color="primary"
              onClick={() => {
                // Placeholder for add to chat functionality
              }}
              data-test-subj="clusterHealthPanelAddToChatButton"
            >
              {i18n.translate('xpack.kubernetesPoc.clusterHealthPanel.addToChat', {
                defaultMessage: 'Add to chat',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};
