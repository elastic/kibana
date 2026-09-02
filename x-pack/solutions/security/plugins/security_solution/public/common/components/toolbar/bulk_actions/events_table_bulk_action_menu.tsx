/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';
import React, { useMemo } from 'react';
import {
  withActionIcons,
  withGroupSeparators,
  withStatusDotIcons,
} from '../../../utils/action_menu_items';
import { ACTION_ICONS_BY_ID } from '../../../utils/action_icons';
import {
  ALERT_STATUS_ICON_COLORS,
  type BulkActionGroups,
  type BulkActionMenuItem,
} from './use_bulk_action_items';

interface EventsTableBulkActionMenuProps {
  /** Flat item list — used only when `groups` is not provided. */
  items: BulkActionMenuItem[];
  panels: EuiContextMenuPanelDescriptor[];
  /**
   * Structured groups from `useBulkActionItems`. When present, the menu inserts
   * group-separator items between non-empty groups instead of relying on key
   * inspection to guess which items are status items.
   */
  groups?: BulkActionGroups;
}

export const EventsTableBulkActionMenu = ({
  items,
  panels,
  groups,
}: EventsTableBulkActionMenuProps) => {
  const decoratedItems = useMemo(() => {
    if (groups) {
      const { statusItems, customItems, workflowItems } = groups;
      return withActionIcons(
        withGroupSeparators([
          withStatusDotIcons(statusItems, ALERT_STATUS_ICON_COLORS),
          customItems,
          workflowItems,
        ]),
        ACTION_ICONS_BY_ID
      );
    }
    // Fallback for callers that pass a flat `items` list without groups.
    return withActionIcons(items, ACTION_ICONS_BY_ID);
  }, [groups, items]);

  const menuPanels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [{ id: 0, items: decoratedItems }, ...panels],
    [decoratedItems, panels]
  );

  return <EuiContextMenu panels={menuPanels} initialPanelId={0} />;
};
