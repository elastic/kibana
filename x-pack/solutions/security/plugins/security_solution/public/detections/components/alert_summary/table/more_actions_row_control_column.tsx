/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiPopover, EuiToolTip } from '@elastic/eui';
import type { EcsSecurityExtension } from '@kbn/securitysolution-ecs';
import type { Alert } from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';
import { expandDottedObject } from '../../../../../common/utils/expand_dotted';
import { useAlertTagsActions } from '../../alerts_table/timeline_actions/use_alert_tags_actions';
import { useAddToCaseActions } from '../../alerts_table/timeline_actions/use_add_to_case_actions';
import { AlertSummaryActionMenu } from '../action_menu/alert_summary_action_menu';
import { REMOVE_FROM_CASE_ACTION_ID } from '../../../../common/constants/action_ids';
import { REMOVE_FROM_CASE } from '../../alerts_table/translations';

export const MORE_ACTIONS_BUTTON_TEST_ID = 'alert-summary-table-row-action-more-actions';

export const MORE_ACTIONS_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertSummary.table.moreActionsAriaLabel',
  {
    defaultMessage: 'More actions',
  }
);

export interface MoreActionsRowControlColumnProps {
  alert: Alert;
  /**
   * Adds a "Remove from case" item, used in the case view
   */
  onRemoveFromCase?: (alertId: string) => void;
}

/**
 * Renders a horizontal 3-dot button which displays a context menu when clicked.
 * This is used in EASE alert summary table.
 * The following options are available:
 * - add to existing case
 * - add to new case
 * - remove from case, when `onRemoveFromCase` is set
 * - apply alert tags
 */
export const MoreActionsRowControlColumn = memo((props: MoreActionsRowControlColumnProps) => {
  const { alert, onRemoveFromCase } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const ecsAlert = useMemo(() => expandDottedObject(alert) as EcsSecurityExtension, [alert]);

  const button = useMemo(
    () => (
      <EuiToolTip content={MORE_ACTIONS_BUTTON_ARIA_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          aria-label={MORE_ACTIONS_BUTTON_ARIA_LABEL}
          data-test-subj={MORE_ACTIONS_BUTTON_TEST_ID}
          iconType="boxesVertical"
          onClick={togglePopover}
        />
      </EuiToolTip>
    ),
    [togglePopover]
  );

  const nonEcsData = useMemo(
    () =>
      Object.entries(alert).map(([field, value]) => ({
        field,
        value: Array.isArray(value) ? (value as string[]) : value != null ? [String(value)] : [],
      })),
    [alert]
  );

  const { addToCaseActionItems } = useAddToCaseActions({
    ecsData: ecsAlert,
    nonEcsData,
    onMenuItemClick: closePopover,
  });

  const { alertTagsItems, alertTagsPanels } = useAlertTagsActions({
    closePopover,
    ecsRowData: ecsAlert,
  });

  const removeFromCaseItems = useMemo(
    () =>
      onRemoveFromCase
        ? [
            {
              key: REMOVE_FROM_CASE_ACTION_ID,
              'data-test-subj': REMOVE_FROM_CASE_ACTION_ID,
              name: REMOVE_FROM_CASE,
              onClick: () => {
                closePopover();
                onRemoveFromCase(alert._id);
              },
            },
          ]
        : [],
    [alert._id, closePopover, onRemoveFromCase]
  );

  return (
    <EuiPopover
      aria-label={MORE_ACTIONS_BUTTON_ARIA_LABEL}
      button={button}
      closePopover={togglePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <AlertSummaryActionMenu
        addToCaseItems={addToCaseActionItems}
        removeFromCaseItems={removeFromCaseItems}
        alertTagsItems={alertTagsItems}
        panels={alertTagsPanels}
      />
    </EuiPopover>
  );
});

MoreActionsRowControlColumn.displayName = 'MoreActionsRowControlColumn';
