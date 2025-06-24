/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { useState } from 'react';
import { EuiPopover, EuiContextMenuItem, EuiContextMenuPanel, EuiButtonIcon } from '@elastic/eui';

interface Props {
  setDashboardAttachmentReady?: (value: boolean) => void;
}

export function ErrorBudgetActions({ setDashboardAttachmentReady }: Props) {
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const handleAddToDashboard = () => {
    setIsActionsPopoverOpen(false);
    if (setDashboardAttachmentReady) {
      setDashboardAttachmentReady(true);
    }
  };
  const ContextMenuButton = (
    <EuiButtonIcon
      data-test-subj="o11yErrorBudgetActionsButton"
      iconType={'boxesHorizontal'}
      onClick={() => setIsActionsPopoverOpen(!isActionsPopoverOpen)}
    />
  );
  return (
    <EuiPopover
      isOpen={isActionsPopoverOpen}
      button={ContextMenuButton}
      closePopover={() => setIsActionsPopoverOpen(false)}
    >
      <EuiContextMenuPanel>
        <EuiContextMenuItem
          icon="dashboardApp"
          key="addToDashboard"
          onClick={handleAddToDashboard}
          data-test-subj="sloActionsAddToDashboard"
        >
          {i18n.translate('xpack.slo.item.actions.addToDashboard', {
            defaultMessage: 'Add to Dashboard',
          })}
        </EuiContextMenuItem>
      </EuiContextMenuPanel>
    </EuiPopover>
  );
}
