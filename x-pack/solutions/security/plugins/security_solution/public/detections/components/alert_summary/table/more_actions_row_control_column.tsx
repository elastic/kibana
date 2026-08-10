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
import {
  SHARED_ACTION_IDS,
  SecurityActionMenuContent,
  type SecurityActionMenuActionId,
  type SecurityActionMenuContribution,
} from '../../../../common/components/security_action_menu';
import {
  ALERT_SUMMARY_ACTION_MENU_PRESET,
  type AlertSummaryActionId,
} from '../action_menu/definitions';

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
  alert: Alert;
  customActions?: readonly SecurityActionMenuContribution[];
  actionOrder?: readonly SecurityActionMenuActionId[];
}

/**
 * Renders a horizontal 3-dot button which displays a context menu when clicked.
 * This is used in EASE alert summary table.
 * The following options are available:
 * - add to existing case
 * - add to new case
 * - apply alert tags
 */
export const MoreActionsRowControlColumn = memo(
  ({ alert, customActions, actionOrder }: MoreActionsRowControlColumnProps) => {
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
      ariaLabel: ADD_TO_CASE_ARIA_LABEL,
    });

    const { alertTagsItems, alertTagsPanels } = useAlertTagsActions({
      closePopover,
      ecsRowData: ecsAlert,
    });

    const contributions: Array<SecurityActionMenuContribution<AlertSummaryActionId>> = useMemo(
      () => [
        {
          id: SHARED_ACTION_IDS.addToCase,
          items: addToCaseActionItems,
        },
        {
          id: SHARED_ACTION_IDS.applyAlertTags,
          items: alertTagsItems,
          panels: alertTagsPanels,
        },
      ],
      [addToCaseActionItems, alertTagsItems, alertTagsPanels]
    );
    return (
      <EuiPopover
        aria-label={MORE_ACTIONS_BUTTON_ARIA_LABEL}
        button={button}
        closePopover={closePopover}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <SecurityActionMenuContent
          preset={ALERT_SUMMARY_ACTION_MENU_PRESET}
          contributions={contributions}
          customActions={customActions}
          actionOrder={actionOrder}
          closeMenu={closePopover}
        />
      </EuiPopover>
    );
  }
);

MoreActionsRowControlColumn.displayName = 'MoreActionsRowControlColumn';
