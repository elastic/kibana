/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiButton,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSkeletonText,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface HomePageStatPanelMetric {
  key: string;
  label: string;
  value: string;
  isLoading: boolean;
}

export interface HomePageStatPanelAction {
  key: string;
  iconType: string;
  label: string;
  onClick: () => void;
  testSubj?: string;
  telemetryId?: string;
}

export interface HomePageStatPanelProps {
  iconType: string;
  title: string;
  testSubj: string;
  metrics: HomePageStatPanelMetric[];
  showPrimary?: boolean;
  actions: HomePageStatPanelAction[];
}

export const HomePageStatPanel = ({
  iconType,
  title,
  testSubj,
  metrics,
  actions,
  showPrimary = false,
}: HomePageStatPanelProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);

  const primaryAction = showPrimary ? actions[0] : undefined;
  const menuActions = showPrimary ? actions.slice(1) : actions;

  const panels = [
    {
      id: 0,
      items: menuActions.map(({ key, iconType, label, onClick, testSubj, telemetryId }) => ({
        key,
        name: label,
        icon: iconType,
        'data-test-subj': testSubj,
        'data-telemetry-id': telemetryId,
        onClick: () => {
          closePopover();
          onClick();
        },
      })),
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={testSubj}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiTitle size="xxs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {actions.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {primaryAction && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="text"
                    size="s"
                    onClick={primaryAction.onClick}
                    data-test-subj={primaryAction.testSubj}
                    data-telemetry-id={primaryAction.telemetryId}
                  >
                    {primaryAction.label}
                  </EuiButton>
                </EuiFlexItem>
              )}
              {menuActions.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiButtonIcon
                        iconType="ellipsis"
                        aria-label={i18n.translate('xpack.serverlessVectordb.home.statPanel.actionsMenu', {
                          defaultMessage: '{title} actions',
                          values: { title },
                        })}
                        onClick={() => setIsPopoverOpen((open) => !open)}
                        size="s"
                        color="text"
                        data-test-subj={`${testSubj}ActionsButton`}
                      />
                    }
                    isOpen={isPopoverOpen}
                    closePopover={closePopover}
                    panelPaddingSize="none"
                    anchorPosition="downRight"
                  >
                    <EuiContextMenu initialPanelId={0} panels={panels} />
                  </EuiPopover>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l" responsive={false} justifyContent="spaceBetween">
        {metrics.map(({ key, label, value, isLoading }) => (
          <EuiFlexItem key={key} grow>
            <EuiStat
              title={isLoading ? <EuiSkeletonText size="m" lines={1} /> : value}
              titleColor="text"
              description={
                <>
                  <EuiText size="s" color="subdued">
                    {label}
                  </EuiText>
                  <EuiSpacer size="xs" />
                </>
              }
              descriptionElement="p"
              titleSize="m"
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </EuiPanel>
  );
};
