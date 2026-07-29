/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
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
  actions: HomePageStatPanelAction[];
}

export const HomePageStatPanel = ({
  iconType,
  title,
  testSubj,
  metrics,
  actions,
}: HomePageStatPanelProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const contextMenuItems = actions.map(
    ({ key, iconType: actionIconType, label, onClick, testSubj: actionTestSubj, telemetryId }) => (
      <EuiContextMenuItem
        key={key}
        icon={actionIconType}
        onClick={() => {
          setIsPopoverOpen(false);
          onClick();
        }}
        data-test-subj={actionTestSubj}
        data-telemetry-id={telemetryId}
      >
        {label}
      </EuiContextMenuItem>
    )
  );

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
              closePopover={() => setIsPopoverOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel items={contextMenuItems} />
            </EuiPopover>
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
