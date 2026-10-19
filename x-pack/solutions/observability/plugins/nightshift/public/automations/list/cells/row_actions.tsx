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
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import type { Automation } from '../../hooks/use_automations';
import { listLabels } from '../translations';

export const AutomationActions = ({
  automation,
  onClone,
  onDelete,
}: {
  automation: Automation;
  onClone: () => void;
  onDelete: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
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
            key="clone"
            icon="copy"
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
            icon="trash"
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
