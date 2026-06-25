/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import type { ArtifactChangeHistoryItem } from './types';
import * as i18n from './translations';

interface ArtifactsVersionHistoryItemProps {
  item: ArtifactChangeHistoryItem;
  selected?: boolean;
  onClick: () => void;
  onViewDetails: (item: ArtifactChangeHistoryItem) => void;
}

export const ArtifactsVersionHistoryItem = memo(function ArtifactsVersionHistoryItem({
  item,
  selected,
  onClick,
  onViewDetails,
}: ArtifactsVersionHistoryItemProps): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const closeActions = useCallback(() => setIsActionsOpen(false), []);

  const handleViewDetails = useCallback(() => {
    closeActions();
    onViewDetails(item);
  }, [closeActions, item, onViewDetails]);

  const actionPanels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: i18n.VIEW_DETAILS_ACTION,
            icon: 'eye',
            onClick: handleViewDetails,
          },
          {
            name: i18n.REVERT_ACTION,
            icon: 'editorUndo',
            onClick: closeActions,
          },
        ],
      },
    ],
    [closeActions, handleViewDetails]
  );

  const styles = useMemo(
    () => ({
      panel: css`
        margin-bottom: ${euiTheme.size.m};
        border-left: ${selected
          ? `${euiTheme.size.xs} solid ${euiTheme.colors.primary}`
          : `${euiTheme.size.xs} solid transparent`};

        &:hover,
        &:focus {
          box-shadow: none;
          transform: none;
        }
      `,
    }),
    [euiTheme, selected]
  );

  return (
    <EuiPanel
      hasBorder
      color={selected ? 'primary' : undefined}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      data-test-subj={`artifactsVersionHistoryItem-${item.id}`}
      css={styles.panel}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{item.artifactTypeLabel}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.securitySolution.artifacts.versionHistory.changeSummary"
              defaultMessage="{userName} • {relativeDate} • {changeCount}"
              values={{
                userName: item.userName,
                relativeDate: (
                  <FormattedRelativePreferenceDate
                    value={item.timestamp}
                    dateFormat="MMM D, YYYY"
                  />
                ),
                changeCount: i18n.N_CHANGES(item.changeCount),
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} onClick={(event) => event.stopPropagation()}>
          <EuiPopover
            button={
              <EuiButtonIcon
                iconType="boxesVertical"
                aria-label={i18n.ITEM_ACTIONS_ARIA_LABEL}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsActionsOpen((isOpen) => !isOpen);
                }}
                data-test-subj={`artifactsVersionHistoryItemActions-${item.id}`}
              />
            }
            isOpen={isActionsOpen}
            closePopover={closeActions}
            panelPaddingSize="none"
            anchorPosition="leftUp"
          >
            <EuiContextMenu initialPanelId={0} panels={actionPanels} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
