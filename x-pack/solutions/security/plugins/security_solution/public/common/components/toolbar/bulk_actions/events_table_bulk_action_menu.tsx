/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { BulkActionMenuItem } from './use_bulk_action_items';

interface EventsTableBulkActionMenuProps {
  items: BulkActionMenuItem[];
  panels: EuiContextMenuPanelDescriptor[];
}

export const EventsTableBulkActionMenu = ({ items, panels }: EventsTableBulkActionMenuProps) => {
  const menuPanels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [{ id: 0, items }, ...panels],
    [items, panels]
  );

  return <EuiContextMenu panels={menuPanels} initialPanelId={0} />;
};
