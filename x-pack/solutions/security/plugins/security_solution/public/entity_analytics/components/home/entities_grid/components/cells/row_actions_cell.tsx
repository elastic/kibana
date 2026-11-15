/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import type { Row } from '../../common';

const i18nStrings = {
  investigateInTimeline: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.rowActions.investigateInTimelineTooltip',
    { defaultMessage: 'Investigate in timeline' }
  ),
  openEntityGraph: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.rowActions.openEntityGraphTooltip',
    { defaultMessage: 'Open entity graph' }
  ),
  moreActions: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.rowActions.moreActionsTooltip',
    { defaultMessage: 'More actions' }
  ),
  addToChat: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.rowActions.addToChatLabel',
    { defaultMessage: 'Add to chat' }
  ),
};

export interface RowActions {
  onInvestigateInTimeline: (row: Row) => void;
  onOpenEntityGraph: (row: Row) => void;
  /** Absent when the agent chat is unavailable, which hides the item. */
  onAddToChat?: (row: Row) => void;
}

interface RowActionsCellProps {
  onInvestigateInTimeline: () => void;
  onOpenEntityGraph: () => void;
  onAddToChat?: () => void;
}

export const RowActionsCell: React.FC<RowActionsCellProps> = ({
  onInvestigateInTimeline,
  onOpenEntityGraph,
  onAddToChat,
}) => {
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const moreActionsButton = (
    <EuiToolTip content={i18nStrings.moreActions} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="boxesVertical"
        aria-label={i18nStrings.moreActions}
        color="text"
        size="xs"
        onClick={() => setIsMoreActionsOpen((prev) => !prev)}
      />
    </EuiToolTip>
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18nStrings.investigateInTimeline} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="timeline"
            aria-label={i18nStrings.investigateInTimeline}
            color="text"
            size="xs"
            onClick={onInvestigateInTimeline}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18nStrings.openEntityGraph} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cluster"
            aria-label={i18nStrings.openEntityGraph}
            color="text"
            size="xs"
            onClick={onOpenEntityGraph}
          />
        </EuiToolTip>
      </EuiFlexItem>
      {onAddToChat && (
        <EuiFlexItem grow={false}>
          {/* Mounted only once opened: a mounted popover scans its button for focusables, too costly per row. */}
          {isMoreActionsOpen ? (
            <EuiPopover
              aria-label={i18nStrings.moreActions}
              button={moreActionsButton}
              isOpen
              closePopover={() => setIsMoreActionsOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenuPanel
                items={[
                  <EuiContextMenuItem
                    key="addToChat"
                    icon="addToChat"
                    onClick={() => {
                      setIsMoreActionsOpen(false);
                      onAddToChat();
                    }}
                  >
                    {i18nStrings.addToChat}
                  </EuiContextMenuItem>,
                ]}
              />
            </EuiPopover>
          ) : (
            moreActionsButton
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
