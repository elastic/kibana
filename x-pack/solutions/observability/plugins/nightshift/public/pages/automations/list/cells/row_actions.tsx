/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  useEuiI18n,
} from '@elastic/eui';
import { cloneActionIcon, deleteActionIcon } from '../../action_menu_icons';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../../common/ebt_constants';
import {
  useAutomationRunActivity,
  type Automation,
} from '../../../../data/automations/use_automations';
import { useRunQuotas } from '../../../../data/run_quotas/use_significant_events_run_quotas';
import {
  RUN_AUTOMATION_LABEL,
  getRunAutomationDisabledReason,
  getManualRunQuotaDisabledReason,
} from '../../utils/run_automation';
import { listLabels } from '../translations';

export const AutomationActions = ({
  automation,
  onRun,
  isRunPending,
  onClone,
  onDelete,
}: {
  automation: Automation;
  onRun: () => void;
  isRunPending: boolean;
  onClone: () => void;
  onDelete: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const activity = useAutomationRunActivity(automation, { enabled: isOpen });
  const quotas = useRunQuotas({ enabled: isOpen, poll: isOpen });
  const runDisabledReason =
    getRunAutomationDisabledReason(automation, activity) ?? getManualRunQuotaDisabledReason(quotas);
  const allActionsLabel = useEuiI18n('euiCollapsedItemActions.allActionsTooltip', 'All actions');

  return (
    <EuiPopover
      aria-label={allActionsLabel}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="leftCenter"
      button={
        <EuiToolTip content={allActionsLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="ellipsis"
            color="primary"
            aria-label={allActionsLabel}
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              setIsOpen((open) => !open);
            }}
            data-test-subj={`automationActions-${automation.id}`}
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="run"
            icon="play"
            disabled={Boolean(runDisabledReason) || isRunPending}
            toolTipContent={runDisabledReason}
            onClick={() => {
              setIsOpen(false);
              onRun();
            }}
            data-test-subj="runAutomation"
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.RUN_AUTOMATION,
              element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
            })}
          >
            {RUN_AUTOMATION_LABEL}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="clone"
            icon={cloneActionIcon}
            onClick={(event: React.MouseEvent) => {
              setIsOpen(false);
              onClone();
            }}
            data-test-subj="cloneAutomation"
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.CLONE_AUTOMATION,
              element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
            })}
          >
            {listLabels.clone}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="delete"
            icon={deleteActionIcon}
            color="danger"
            onClick={(event: React.MouseEvent) => {
              setIsOpen(false);
              onDelete();
            }}
            data-test-subj="deleteAutomation"
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.DELETE_AUTOMATION,
              element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
            })}
          >
            {listLabels.delete}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
