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
}

interface RowActionsCellProps {
  onInvestigateInTimeline: () => void;
  onOpenEntityGraph: () => void;
}

export const RowActionsCell: React.FC<RowActionsCellProps> = ({
  onInvestigateInTimeline,
  onOpenEntityGraph,
}) => {
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);

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
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18nStrings.moreActions}
          button={
            <EuiToolTip content={i18nStrings.moreActions} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="boxesVertical"
                aria-label={i18nStrings.moreActions}
                color="text"
                size="xs"
                onClick={() => setIsMoreActionsOpen((prev) => !prev)}
              />
            </EuiToolTip>
          }
          isOpen={isMoreActionsOpen}
          closePopover={() => setIsMoreActionsOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem disabled key="addToChat">
                {i18nStrings.addToChat}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
