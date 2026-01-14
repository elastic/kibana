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
  EuiPanel,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiPopover,
  EuiContextMenu,
  EuiLoadingSpinner,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface AiSummaryPanelProps {
  isLoading?: boolean;
}

export const AiSummaryPanel: React.FC<AiSummaryPanelProps> = ({ isLoading = false }) => {
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
          name: i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.refreshLabel', {
            defaultMessage: 'Refresh',
          }),
          icon: 'refresh',
          onClick: closePopover,
        },
        {
          name: i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.settingsLabel', {
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
      aria-label={i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.optionsAriaLabel', {
        defaultMessage: 'Options',
      })}
      size="xs"
      color="text"
      css={{ minWidth: 'auto', minBlockSize: 'auto' }}
      data-test-subj="aiSummaryPanelOptionsButton"
    />
  );

  // Summary content with inline links matching the design mockup
  const summaryContent = (
    <>
      {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.summaryPart1', {
        defaultMessage:
          'Overall, the Kubernetes cluster is operating within healthy parameters, with all control plane components responding normally and 94% of ',
      })}
      <EuiLink
        href="#"
        onClick={(e: React.MouseEvent) => e.preventDefault()}
        data-test-subj="aiSummaryWorkloadsLink"
      >
        {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.workloadsLink', {
          defaultMessage: 'workloads',
        })}
      </EuiLink>
      {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.summaryPart2', {
        defaultMessage: ' running without issues. Node availability is stable, though ',
      })}
      <EuiLink
        href="#"
        onClick={(e: React.MouseEvent) => e.preventDefault()}
        data-test-subj="aiSummaryWorkerNodesLink"
      >
        {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.workerNodesLink', {
          defaultMessage: 'two worker nodes',
        })}
      </EuiLink>
      {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.summaryPart3', {
        defaultMessage:
          ' are showing elevated memory pressure and may require attention if usage trends continue.',
      })}
      <br />
      <br />
      {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.summaryPart4', {
        defaultMessage:
          'Pod restart rates remain low across namespaces, indicating no widespread instability, while network latency between nodes is consistent with baseline performance. ',
      })}
      <EuiLink
        href="#"
        onClick={(e: React.MouseEvent) => e.preventDefault()}
        data-test-subj="aiSummaryResourceUtilizationLink"
      >
        {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.resourceUtilizationLink', {
          defaultMessage: 'Resource utilization',
        })}
      </EuiLink>
      {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.summaryPart5', {
        defaultMessage:
          ' is balanced overall, but CPU saturation is beginning to emerge in the production namespace, suggesting upcoming scaling needs. No critical alerts were triggered in the last hour, and cluster capacity remains sufficient for current workloads.',
      })}
    </>
  );

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      css={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${euiTheme.colors.lightestShade} 0%, rgba(125, 107, 255, 0.08) 50%, rgba(54, 162, 235, 0.06) 100%)`,
      }}
    >
      {/* Header */}
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="none"
        responsive={false}
        css={{ flexGrow: 0 }}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="sparkles" size="m" color="primary" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                <h4 style={{ margin: 0, fontWeight: 600 }}>
                  {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.title', {
                    defaultMessage: 'AI Summary',
                  })}
                </h4>
              </EuiText>
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

      <EuiHorizontalRule margin="s" />

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '100%' }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiText size="s" color="default">
            {summaryContent}
          </EuiText>
        )}
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
              {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.generatedOn', {
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
              data-test-subj="aiSummaryPanelAddToChatButton"
            >
              {i18n.translate('xpack.kubernetesPoc.aiSummaryPanel.addToChat', {
                defaultMessage: 'Add to chat',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPanel>
  );
};
