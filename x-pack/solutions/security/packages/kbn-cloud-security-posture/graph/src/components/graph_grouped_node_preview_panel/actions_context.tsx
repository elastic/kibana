/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type FC, type ReactNode } from 'react';
import type { EntityOrEventItem, EntityItem, EventItem, AlertItem } from './components/grouped_item/types';

export interface GroupedNodePreviewActions {
  /**
   * Optional handler invoked when the user requests the preview for a single grouped item.
   * When provided, leaf components (title link, kebab menu) call this instead of dispatching
   * `openPreviewPanel` via `useExpandableFlyoutApi`. This is the seam Flyout v2 hosts use to
   * route previews through `overlays.openSystemFlyout` while the legacy expandable-flyout host
   * keeps the original behavior by simply not providing a handler.
   */
  onShowItemDetails?: (item: EntityOrEventItem) => void;
}

const GroupedNodePreviewActionsContext = createContext<GroupedNodePreviewActions>({});

export const GroupedNodePreviewActionsProvider: FC<
  { children: ReactNode } & GroupedNodePreviewActions
> = ({ children, onShowItemDetails }) => {
  const value = useMemo<GroupedNodePreviewActions>(
    () => ({ onShowItemDetails }),
    [onShowItemDetails]
  );
  return (
    <GroupedNodePreviewActionsContext.Provider value={value}>
      {children}
    </GroupedNodePreviewActionsContext.Provider>
  );
};

export const useGroupedNodePreviewActions = (): GroupedNodePreviewActions =>
  useContext(GroupedNodePreviewActionsContext);

export type { EntityOrEventItem, EntityItem, EventItem, AlertItem };
