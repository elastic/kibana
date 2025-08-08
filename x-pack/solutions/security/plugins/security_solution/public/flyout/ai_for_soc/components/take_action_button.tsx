/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAIForSOCDetailsContext } from '../context';
import { useAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { useAlertTagsActions } from '../../../detections/components/alerts_table/timeline_actions/use_alert_tags_actions';

export const TAKE_ACTION_BUTTON_TEST_ID = 'alert-summary-flyout-take-action';

export const TAKE_ACTION_BUTTON = i18n.translate(
  'xpack.securitySolution.alertSummary.flyout.takeActionsAriaLabel',
  {
    defaultMessage: 'Take action',
  }
);
export const ADD_TO_CASE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertSummary.flyout.attachToCaseAriaLabel',
  {
    defaultMessage: 'Attach alert to case',
  }
);

/**
 * Take action button in the panel footer.
 * This is used in the AI for SOC alert summary page.
 * The following options are available:
 * - add to existing case
 * - add to new case
 * - apply alert tags
 */
export const TakeActionButton = memo(() => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { dataAsNestedObject } = useAIForSOCDetailsContext();

  const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = useMemo(
    () => (
      <EuiButton
        aria-label={TAKE_ACTION_BUTTON}
        data-test-subj={TAKE_ACTION_BUTTON_TEST_ID}
        fill
        iconSide="right"
        iconType="arrowDown"
        onClick={togglePopover}
      >
        {TAKE_ACTION_BUTTON}
      </EuiButton>
    ),
    [togglePopover]
  );

  const { addToCaseActionItems } = useAddToCaseActions({
    ecsData: dataAsNestedObject,
    onMenuItemClick: closePopover,
    isActiveTimelines: false,
    ariaLabel: ADD_TO_CASE_ARIA_LABEL,
    isInDetections: true,
  });

  const { alertTagsItems, alertTagsPanels } = useAlertTagsActions({
    closePopover,
    ecsRowData: dataAsNestedObject,
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
});

TakeActionButton.displayName = 'TakeActionButton';
