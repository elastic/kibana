/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AnonymizationSwitch } from './anonymization_switch';

export const ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID =
  'ai-for-soc-alert-flyout-alert-summary-options-menu-button';
export const ALERT_SUMMARY_OPTIONS_MENU_PANELS_TEST_ID =
  'ai-for-soc-alert-flyout-alert-summary-options-menu-panels';

const OPTIONS_MENU = i18n.translate('xpack.securitySolution.flyout.alertSummary.optionsMenuTitle', {
  defaultMessage: 'Options',
});

export interface AlertSummaryOptionsMenu {
  /**
   * To pass down to the anonymization component rendered in the popover
   */
  hasAlertSummary: boolean;
}

/**
 * Options menu displayed to the right of the AI summary section in the alert summary flyout.
 * It currently contains a single option to allows anonymizing values.
 */
export const AlertSummaryOptionsMenu = memo(({ hasAlertSummary }: AlertSummaryOptionsMenu) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const togglePopover = useCallback(() => setPopover(!isPopoverOpen), [isPopoverOpen]);

  const button = useMemo(
    () => (
      <EuiButtonIcon
        aria-label={OPTIONS_MENU}
        data-test-subj={ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID}
        color="text"
        iconType="boxesVertical"
        onClick={togglePopover}
      />
    ),
    [togglePopover]
  );
  const panels = useMemo(
    () => [
      {
        id: 0,
        title: OPTIONS_MENU,
        content: (
          <EuiPanel paddingSize="s">
            <AnonymizationSwitch hasAlertSummary={hasAlertSummary} />
          </EuiPanel>
        ),
      },
    ],
    [hasAlertSummary]
  );
  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={togglePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu
        data-test-subj={ALERT_SUMMARY_OPTIONS_MENU_PANELS_TEST_ID}
        initialPanelId={0}
        panels={panels}
      />
    </EuiPopover>
  );
});

AlertSummaryOptionsMenu.displayName = 'AlertSummaryOptionsMenu';
