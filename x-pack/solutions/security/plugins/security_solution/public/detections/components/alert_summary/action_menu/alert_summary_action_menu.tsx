/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu } from '@elastic/eui';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { withActionIcons } from '../../../../common/utils/action_menu_items';
import { ACTION_ICONS_BY_ID } from '../../../../common/utils/action_icons';

interface AlertSummaryActionMenuProps {
  addToCaseItems: EuiContextMenuPanelItemDescriptor[];
  removeFromCaseItems?: EuiContextMenuPanelItemDescriptor[];
  alertTagsItems: EuiContextMenuPanelItemDescriptor[];
  panels: EuiContextMenuPanelDescriptor[];
}

const EMPTY_ITEMS: EuiContextMenuPanelItemDescriptor[] = [];

export const AlertSummaryActionMenu = ({
  addToCaseItems,
  removeFromCaseItems = EMPTY_ITEMS,
  alertTagsItems,
  panels,
}: AlertSummaryActionMenuProps) => {
  const items = useMemo(
    () =>
      withActionIcons(
        [...addToCaseItems, ...removeFromCaseItems, ...alertTagsItems],
        ACTION_ICONS_BY_ID
      ),
    [addToCaseItems, removeFromCaseItems, alertTagsItems]
  );

  const menuPanels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [{ id: 0, items }, ...panels],
    [items, panels]
  );

  return <EuiContextMenu initialPanelId={0} panels={menuPanels} />;
};
