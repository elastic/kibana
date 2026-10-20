/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { ENTITY_ANOMALY_TABLE_ACTIONS_COLUMN_TOOLTIP } from '../translations';
import type { TableRow } from './types';
import { useAnomalyTableRowActions } from '../../../api/hooks/use_anomaly_table_row_actions';
import {
  ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID,
  ANOMALIES_TABLE_ROW_ACTION_TEST_ID_PREFIX,
} from '../test_ids';
import type { EntityToAttach } from '../../../../cases/attachments/entity';
import { useEntityCaseTakeActionItems } from '../../../../cases/attachments/entity/hooks/use_entity_case_take_action_items';

interface AnomalyRowActionsMenuProps {
  entityToAttach: EntityToAttach;
  row: TableRow;
  timeRange: { from: string; to: string };
}

export const AnomalyRowActionsMenu: React.FC<AnomalyRowActionsMenuProps> = ({
  entityToAttach,
  row,
  timeRange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((value) => !value), []);

  const { actions } = useAnomalyTableRowActions({ row, timeRange, closePopover });
  const caseItems = useEntityCaseTakeActionItems(entityToAttach);

  const items = useMemo(
    () => [
      ...caseItems(closePopover),
      ...actions.map((action) => (
        <EuiContextMenuItem
          key={action.key}
          icon={action.icon}
          onClick={action.onClick}
          data-test-subj={`${ANOMALIES_TABLE_ROW_ACTION_TEST_ID_PREFIX}${action.key}`}
        >
          {action.label}
        </EuiContextMenuItem>
      )),
    ],
    [actions, caseItems, closePopover]
  );

  const button = (
    <EuiToolTip content={ENTITY_ANOMALY_TABLE_ACTIONS_COLUMN_TOOLTIP} disableScreenReaderOutput>
      <EuiButtonIcon
        data-test-subj={ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID}
        iconType="boxesVertical"
        aria-label={ENTITY_ANOMALY_TABLE_ACTIONS_COLUMN_TOOLTIP}
        onClick={togglePopover}
        color={isOpen ? 'primary' : 'text'}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      aria-label={ENTITY_ANOMALY_TABLE_ACTIONS_COLUMN_TOOLTIP}
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};
