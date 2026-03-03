/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';

import type { BulkAttackActionItems, BulkAttackContextMenuItems } from '../types';

interface TransformBulkActionsToContextMenuItemsProps {
  /** Bulk action items and panels from bulk action hooks. */
  bulkActionItems: BulkAttackActionItems;
  /** Array of TimelineItem representing attacks. */
  alertItems: TimelineItem[];
  /** Optional callback to close the popover menu. */
  closePopover?: () => void;
  /** Optional callback to clear the current selection. */
  clearSelection?: () => void;
  /** Optional callback to refresh the data. */
  refresh?: () => void;
  /** Optional callback to set loading state. */
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Transforms bulk action items and panels into context menu items and panels.
 * This utility function is used by context menu hooks to convert bulk action configurations
 * into the format required by EuiContextMenu.
 *
 * @param props - {@link TransformBulkActionsToContextMenuItemsProps}
 */
export const transformBulkActionsToContextMenuItems = ({
  bulkActionItems,
  alertItems,
  closePopover,
  clearSelection,
  refresh,
  setIsLoading,
}: TransformBulkActionsToContextMenuItemsProps): BulkAttackContextMenuItems => {
  const items: EuiContextMenuPanelItemDescriptorEntry[] = bulkActionItems.items.map((item) => {
    return {
      name: item.label,
      panel: item.panel,
      'data-test-subj': item['data-test-subj'],
      key: item.key,
      onClick: item.onClick
        ? () =>
            item.onClick?.(
              alertItems,
              false,
              (loading) => setIsLoading?.(loading),
              () => clearSelection?.(),
              () => refresh?.()
            )
        : undefined,
    };
  });

  const panels: EuiContextMenuPanelDescriptor[] = bulkActionItems.panels.map((panel) => {
    const content = panel.renderContent({
      alertItems,
      clearSelection,
      closePopoverMenu: () => closePopover?.(),
      setIsBulkActionsLoading: (loading) => setIsLoading?.(loading),
      refresh,
    });
    return {
      title: panel.title,
      content,
      id: panel.id,
      width: panel.width,
    };
  });

  return { items, panels };
};
