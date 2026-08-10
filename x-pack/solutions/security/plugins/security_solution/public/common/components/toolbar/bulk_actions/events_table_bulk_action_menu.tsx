/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';
import { AddToCaseActionPanel, ADD_TO_CASE, CASE_TYPE } from '@kbn/response-ops-alerts-table';
import React, { useMemo } from 'react';
import {
  ADD_TO_EXISTING_CASE,
  ADD_TO_NEW_CASE,
} from '../../../../cases/attachments/event/translations';
import type { BulkActionMenuItem } from './use_bulk_action_items';

const ADD_TO_NEW_CASE_ACTION_ID = 'attach-new-case';
const ADD_TO_EXISTING_CASE_ACTION_ID = 'attach-existing-case';
const ADD_TO_CASE_ACTION_ID = 'add-to-case';
const ADD_TO_CASE_PANEL_ID = 'events-table-add-to-case-panel';

interface EventsTableBulkActionMenuProps {
  items: BulkActionMenuItem[];
  panels: EuiContextMenuPanelDescriptor[];
}

export const EventsTableBulkActionMenu = ({ items, panels }: EventsTableBulkActionMenuProps) => {
  const menuPanels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
    const addToNewCase = items.find(({ key }) => key === ADD_TO_NEW_CASE_ACTION_ID);
    const addToExistingCase = items.find(({ key }) => key === ADD_TO_EXISTING_CASE_ACTION_ID);

    if (!addToNewCase?.onActionClick || !addToExistingCase?.onActionClick) {
      return [{ id: 0, items }, ...panels];
    }

    const firstCaseActionIndex = items.findIndex(
      ({ key }) => key === ADD_TO_NEW_CASE_ACTION_ID || key === ADD_TO_EXISTING_CASE_ACTION_ID
    );
    const initialItems = items.filter(
      ({ key }) => key !== ADD_TO_NEW_CASE_ACTION_ID && key !== ADD_TO_EXISTING_CASE_ACTION_ID
    );
    initialItems.splice(firstCaseActionIndex, 0, {
      key: ADD_TO_CASE_ACTION_ID,
      'data-test-subj': ADD_TO_CASE_ACTION_ID,
      disabled: Boolean(addToNewCase.disabled && addToExistingCase.disabled),
      icon: 'briefcase',
      name: ADD_TO_CASE,
      panel: ADD_TO_CASE_PANEL_ID,
    });

    return [
      { id: 0, items: initialItems },
      {
        id: ADD_TO_CASE_PANEL_ID,
        title: CASE_TYPE,
        content: (
          <AddToCaseActionPanel
            actions={[
              {
                id: ADD_TO_NEW_CASE_ACTION_ID,
                label: ADD_TO_NEW_CASE,
                dataTestSubj: addToNewCase['data-test-subj'],
                disabled: addToNewCase.disabled,
                onClick: addToNewCase.onActionClick,
              },
              {
                id: ADD_TO_EXISTING_CASE_ACTION_ID,
                label: ADD_TO_EXISTING_CASE,
                dataTestSubj: addToExistingCase['data-test-subj'],
                disabled: addToExistingCase.disabled,
                onClick: addToExistingCase.onActionClick,
              },
            ]}
          />
        ),
      },
      ...panels,
    ];
  }, [items, panels]);

  return <EuiContextMenu panels={menuPanels} initialPanelId={0} />;
};
