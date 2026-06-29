/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { useBehavioralAnomalyV2RowActions } from '../hooks/use_behavioral_anomaly_row_actions';
import { ANOMALIES_TABLE_V2_ROW_ACTIONS_ARIA_LABEL } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_ACTIONS_BUTTON_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_ACTIONS_MENU_TEST_ID,
} from '../test_ids';
import type { BehavioralAnomalyV2TableRow } from '../types';

interface AnomalyRowActionsMenuV2Props {
  row: BehavioralAnomalyV2TableRow;
}

export const AnomalyRowActionsMenuV2: React.FC<AnomalyRowActionsMenuV2Props> = ({ row }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((value) => !value), []);

  const { actions } = useBehavioralAnomalyV2RowActions({ row, closePopover });

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      {
        id: 0,
        items: actions.map((action) => ({
          name: action.label,
          icon: action.icon,
          onClick: action.onClick,
          'data-test-subj': action.dataTestSubj,
        })),
      },
    ],
    [actions]
  );

  const button = (
    <EuiButtonIcon
      iconType="boxesVertical"
      aria-label={ANOMALIES_TABLE_V2_ROW_ACTIONS_ARIA_LABEL}
      onClick={togglePopover}
      color={isOpen ? 'primary' : 'text'}
      data-test-subj={BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_ACTIONS_BUTTON_TEST_ID}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={panels}
        size="s"
        data-test-subj={BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_ACTIONS_MENU_TEST_ID}
      />
    </EuiPopover>
  );
};
