/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';
import React, { useMemo } from 'react';
import { BULK_ADD_TO_CASE_ACTION_ID } from '../../../../cases/attachments/event/hooks/use_bulk_event_actions';
import { BULK_INVESTIGATE_IN_TIMELINE_ACTION_ID } from '../../../../detections/components/alerts_table/timeline_actions/use_add_bulk_to_timeline';
import { RUN_DOCUMENT_WORKFLOW_ACTION_ID } from '../../../../detections/components/alerts_table/timeline_actions/use_run_document_workflow_panel';
import {
  isActionMenuItem,
  withActionIcons,
  withStatusDotIcons,
} from '../../../utils/action_menu_items';
import { ALERT_STATUS_ICON_COLORS, type BulkActionMenuItem } from './use_bulk_action_items';

interface EventsTableBulkActionMenuProps {
  items: BulkActionMenuItem[];
  panels: EuiContextMenuPanelDescriptor[];
}

const ACTION_ICONS_BY_ID = {
  [BULK_ADD_TO_CASE_ACTION_ID]: 'briefcase',
  [BULK_INVESTIGATE_IN_TIMELINE_ACTION_ID]: 'timeline',
  [RUN_DOCUMENT_WORKFLOW_ACTION_ID]: 'workflow',
} as const;

const isStatusItem = (item: BulkActionMenuItem) =>
  isActionMenuItem(item) &&
  typeof item.key === 'string' &&
  Object.prototype.hasOwnProperty.call(ALERT_STATUS_ICON_COLORS, item.key);

export const EventsTableBulkActionMenu = ({ items, panels }: EventsTableBulkActionMenuProps) => {
  const decoratedItems = useMemo(() => {
    const statusItems = items.filter(isStatusItem);
    const actionItems = items.filter((item) => !isStatusItem(item));
    return withActionIcons(
      [...withStatusDotIcons(statusItems, ALERT_STATUS_ICON_COLORS), ...actionItems],
      ACTION_ICONS_BY_ID
    );
  }, [items]);

  const menuPanels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [{ id: 0, items: decoratedItems }, ...panels],
    [decoratedItems, panels]
  );

  return <EuiContextMenu panels={menuPanels} initialPanelId={0} />;
};
