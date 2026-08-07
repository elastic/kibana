/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { orderSecurityActionMenuContributions } from './order_actions';
import type {
  SecurityActionMenuActionId,
  SecurityActionMenuContribution,
  SecurityActionMenuPreset,
} from './types';

export interface ComposeSecurityActionMenuProps {
  preset?: SecurityActionMenuPreset;
  contributions: readonly SecurityActionMenuContribution[];
  customActions?: readonly SecurityActionMenuContribution[];
  actionOrder?: readonly SecurityActionMenuActionId[];
  closeMenu?: () => void;
}

export interface ComposedSecurityActionMenu {
  items: SecurityActionMenuContribution['items'];
  panels: EuiContextMenuPanelDescriptor[];
}

export const composeSecurityActionMenu = ({
  preset,
  contributions,
  customActions = [],
  actionOrder,
  closeMenu,
}: ComposeSecurityActionMenuProps): ComposedSecurityActionMenu => {
  const orderedContributions = orderSecurityActionMenuContributions({
    preset,
    contributions: [...contributions, ...customActions],
    actionOrder,
  });
  const wrapItems = (
    menuItems: SecurityActionMenuContribution['items']
  ): SecurityActionMenuContribution['items'] =>
    menuItems.map((item) => {
      if (item.panel != null || item.onClick == null || closeMenu == null) {
        return item;
      }

      return {
        ...item,
        onClick: (event: ReactMouseEvent<Element>) => {
          closeMenu();
          const onClick = item.onClick as (clickEvent: ReactMouseEvent<Element>) => void;
          onClick(event);
        },
      };
    });
  const items = wrapItems(
    orderedContributions.flatMap(({ items: contributionItems }) => contributionItems)
  );
  const childPanels = orderedContributions
    .flatMap(({ panels = [] }) => panels)
    .map((panel) => (panel.items == null ? panel : { ...panel, items: wrapItems(panel.items) }));
  const panelIds = new Set<EuiContextMenuPanelDescriptor['id']>([0]);

  childPanels.forEach(({ id }) => {
    if (panelIds.has(id)) {
      throw new Error(`Security action menu panel "${id}" was contributed more than once`);
    }
    panelIds.add(id);
  });

  return {
    items,
    panels: [{ id: 0, items }, ...childPanels],
  };
};
