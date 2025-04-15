/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { i18n } from '@kbn/i18n';
import { useAlertTagsActions } from '../../alerts_table/timeline_actions/use_alert_tags_actions';
import { useAddToCaseActions } from '../../alerts_table/timeline_actions/use_add_to_case_actions';

export const MORE_ACTIONS_BUTTON_TEST_ID = 'alert-summary-table-row-action-more-actions';

export const MORE_ACTIONS_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertSummary.table.moreActionsAriaLabel',
  {
    defaultMessage: 'More actions',
  }
);
export const ADD_TO_CASE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertSummary.table.attachToCaseAriaLabel',
  {
    defaultMessage: 'Attach alert to case',
  }
);

export interface MoreActionsRowControlColumnProps {
  /**
   * Alert data
   * The Ecs type is @deprecated but needed for the case actions within the more action dropdown
   */
  ecsAlert: Ecs;
}

/**
 * Renders a horizontal 3-dot button which displays a context menu when clicked.
 * This is used in the AI for SOC alert summary table.
 * The following options are available:
 * - add to existing case
 * - add to new case
 * - apply alert tags
 */
export const MoreActionsRowControlColumn = memo(
  ({ ecsAlert }: MoreActionsRowControlColumnProps) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const button = useMemo(
      () => (
        <EuiButtonIcon
          aria-label={MORE_ACTIONS_BUTTON_ARIA_LABEL}
          data-test-subj={MORE_ACTIONS_BUTTON_TEST_ID}
          iconType="boxesHorizontal"
          onClick={togglePopover}
        />
      ),
      [togglePopover]
    );

    const { addToCaseActionItems } = useAddToCaseActions({
      ecsData: ecsAlert,
      onMenuItemClick: closePopover,
      isActiveTimelines: false,
      ariaLabel: ADD_TO_CASE_ARIA_LABEL,
      isInDetections: true,
    });

    const { alertTagsItems, alertTagsPanels } = useAlertTagsActions({
      closePopover,
      ecsRowData: ecsAlert,
    });

    const panels = useMemo(
      () => [
        {
          id: 0,
          items: [...addToCaseActionItems, ...alertTagsItems],
        },
        ...alertTagsPanels,
      ],
      [addToCaseActionItems, alertTagsItems, alertTagsPanels]
    );

    return (
      <EuiPopover
        button={button}
        closePopover={togglePopover}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} size="s" />
      </EuiPopover>
    );
  }
);

MoreActionsRowControlColumn.displayName = 'MoreActionsRowControlColumn';
