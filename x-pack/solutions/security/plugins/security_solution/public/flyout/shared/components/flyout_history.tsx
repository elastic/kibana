/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiText,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FlyoutPanelHistory } from '@kbn/expandable-flyout';
import { FlyoutHistoryRow } from './flyout_history_row';
import {
  FLYOUT_HISTORY_BUTTON_TEST_ID,
  FLYOUT_HISTORY_CONTEXT_PANEL_TEST_ID,
  FLYOUT_HISTORY_TEST_ID,
  NO_DATA_HISTORY_ROW_TEST_ID,
} from './test_ids';

const flyoutHistoryButtonTooltip = i18n.translate(
  'xpack.securitySolution.flyout.right.header.flyoutHistoryButton',
  {
    defaultMessage: 'Flyout history',
  }
);

export interface HistoryProps {
  /**
   * A list of flyouts that have been opened
   */
  history: FlyoutPanelHistory[];
}

/**
 * History of flyouts shown in top navigation
 * Shows the title of previously opened flyout, and count of history of more than 1 flyout was opened
 */
export const FlyoutHistory: FC<HistoryProps> = memo(({ history }) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const togglePopover = () => setPopover(!isPopoverOpen);

  const emptyHistoryMessage = useMemo(() => {
    return (
      <EuiContextMenuItem key={0} data-test-subj={NO_DATA_HISTORY_ROW_TEST_ID}>
        <EuiText size="s">
          <EuiTextColor color="subdued">
            <i>
              <FormattedMessage
                id="xpack.securitySolution.flyout.history.noData"
                defaultMessage="No history"
              />
            </i>
          </EuiTextColor>
        </EuiText>
      </EuiContextMenuItem>
    );
  }, []);

  const historyDropdownPanels = useMemo(
    () =>
      history.length > 0
        ? history.map((item, index) => {
            return (
              <>
                <EuiHorizontalRule margin="none" />
                <FlyoutHistoryRow item={item} index={index} />
              </>
            );
          })
        : [emptyHistoryMessage],
    [history, emptyHistoryMessage]
  );

  return (
    <EuiFlexItem grow={false} data-test-subj={FLYOUT_HISTORY_TEST_ID}>
      <EuiPopover
        button={
          <EuiToolTip content={flyoutHistoryButtonTooltip}>
            <EuiButtonEmpty
              onClick={togglePopover}
              size="m"
              iconType={'clockCounter'}
              data-test-subj={FLYOUT_HISTORY_BUTTON_TEST_ID}
            />
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={togglePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          size="s"
          items={historyDropdownPanels}
          data-test-subj={FLYOUT_HISTORY_CONTEXT_PANEL_TEST_ID}
        />
      </EuiPopover>
    </EuiFlexItem>
  );
});

FlyoutHistory.displayName = 'FlyoutHistory';
