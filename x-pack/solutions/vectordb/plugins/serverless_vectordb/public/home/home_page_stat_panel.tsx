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
  EuiToolTip,
  EuiSplitPanel,
} from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { i18n } from '@kbn/i18n';
import type { NewIndexDetails } from '../../common/types';
import { useNewIndexDismissal } from '../hooks/use_new_index_dismissal';
import { NewIndexPanel } from './new_index_panel';
import { newIndexFooter } from './new_index_panel_styles';

export interface HomePageStatPanelMetric {
  key: string;
  label: string;
  value: string;
  isLoading: boolean;
}

export interface HomePageStatPanelAction {
  key: string;
  iconType?: EuiIconType;
  label: string;
  onClick: () => void;
  testSubj?: string;
  telemetryId: string;
}

export interface HomePageStatPanelProps {
  iconType: EuiIconType;
  title: string;
  testSubj: string;
  metrics: HomePageStatPanelMetric[];
  showPrimary?: boolean;
  actions: HomePageStatPanelAction[];
  actionsMenuTelemetryId?: string;
  newIndex?: NewIndexDetails | null;
}

export const HomePageStatPanel = ({
  iconType,
  title,
  testSubj,
  metrics,
  actions,
  showPrimary = false,
  actionsMenuTelemetryId,
  newIndex,
}: HomePageStatPanelProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { isNewIndexDismissed, dismissNewIndex } = useNewIndexDismissal(
    newIndex?.indexName,
    newIndex?.createdAt
  );
  const closePopover = () => setIsPopoverOpen(false);

  const primaryAction = showPrimary ? actions[0] : undefined;
  const menuActions = showPrimary ? actions.slice(1) : actions;

  const actionsMenuLabel = i18n.translate('xpack.serverlessVectordb.home.statPanel.actionsMenu', {
    defaultMessage: '{title} actions',
    values: { title },
  });

  const menuItems = menuActions.map((action) => (
    <EuiContextMenuItem
      key={action.key}
      icon={action.iconType}
      data-test-subj={action.testSubj}
      data-telemetry-id={action.telemetryId}
      onClick={() => {
        closePopover();
        action.onClick();
      }}
    >
      {action.label}
    </EuiContextMenuItem>
  ));

  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder={true}>
      <EuiSplitPanel.Inner color="subdued" paddingSize="m" data-test-subj={testSubj}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="m" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxxs" css={{ whiteSpace: 'nowrap' }}>
                  <h3>{title}</h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {actions.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                {primaryAction && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="text"
                      size="s"
                      iconType={primaryAction.iconType}
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
                      aria-label={actionsMenuLabel}
                      button={
                        <EuiToolTip content={actionsMenuLabel} disableScreenReaderOutput>
                          <EuiButtonIcon
                            iconType="ellipsis"
                            aria-label={actionsMenuLabel}
                            aria-haspopup="menu"
                            onClick={() => setIsPopoverOpen((open) => !open)}
                            size="s"
                            color="text"
                            data-test-subj={`${testSubj}ActionsButton`}
                            data-telemetry-id={actionsMenuTelemetryId}
                          />
                        </EuiToolTip>
                      }
                      isOpen={isPopoverOpen}
                      closePopover={closePopover}
                      panelPaddingSize="none"
                      anchorPosition="downRight"
                    >
                      <EuiContextMenuPanel items={menuItems} />
                    </EuiPopover>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m" responsive={false} wrap justifyContent="spaceBetween">
          {metrics.map(({ key, label, value, isLoading }) => (
            <EuiFlexItem key={key} grow>
              <EuiPanel color="plain" paddingSize="m" hasBorder={true}>
                <EuiStat
                  data-test-subj={`${testSubj}-${key}`}
                  css={{ whiteSpace: 'nowrap' }}
                  title={
                    isLoading ? (
                      <EuiSkeletonText
                        size="m"
                        lines={1}
                        data-test-subj={`${testSubj}-${key}-loading`}
                      />
                    ) : (
                      <span data-test-subj={`${testSubj}-${key}-value`}>{value}</span>
                    )
                  }
                  titleColor="text"
                  titleElement="div"
                  description={
                    <>
                      <EuiText
                        size="xs"
                        color="subdued"
                        data-test-subj={`${testSubj}-${key}-label`}
                      >
                        {label}
                      </EuiText>
                      <EuiSpacer size="xs" />
                    </>
                  }
                  descriptionElement="div"
                  titleSize="s"
                />
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
      </EuiSplitPanel.Inner>
      {newIndex && !isNewIndexDismissed && (
        <EuiSplitPanel.Inner paddingSize="s" css={newIndexFooter}>
          <NewIndexPanel index={newIndex} onDismiss={dismissNewIndex} />
        </EuiSplitPanel.Inner>
      )}
    </EuiSplitPanel.Outer>
  );
};
