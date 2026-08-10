/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { orderSecurityActionMenuContributions } from './order_actions';
import type { SecurityActionMenuContribution, SecurityActionMenuPreset } from './types';

export interface ComposeSecurityActionMenuProps<
  TActionId extends string = string,
  TGroupId extends string = string
> {
  preset?: SecurityActionMenuPreset<TActionId, TGroupId>;
  contributions: readonly SecurityActionMenuContribution<TActionId>[];
  customActions?: readonly SecurityActionMenuContribution[];
  actionOrder?: readonly string[];
  closeMenu?: () => void;
}

export interface ComposedSecurityActionMenu {
  items: SecurityActionMenuContribution['items'];
  panels: EuiContextMenuPanelDescriptor[];
}

const EXTENSION_GROUP = Symbol('extensionGroup');

export const composeSecurityActionMenu = <TActionId extends string, TGroupId extends string>({
  preset,
  contributions,
  customActions = [],
  actionOrder,
  closeMenu,
}: ComposeSecurityActionMenuProps<TActionId, TGroupId>): ComposedSecurityActionMenu => {
  const allContributions: SecurityActionMenuContribution[] = [...contributions, ...customActions];
  const orderedContributions = orderSecurityActionMenuContributions({
    preset,
    contributions: allContributions,
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
  const presetGroups = new Map<string, TGroupId>(
    preset?.groups.flatMap(({ id, actionIds }) =>
      actionIds.map((actionId) => [actionId, id] as const)
    ) ?? []
  );
  const contributionsById = new Map(
    orderedContributions.map((contribution) => [contribution.id, contribution])
  );
  const resolvedGroups = new Map<string, TGroupId | typeof EXTENSION_GROUP | undefined>();
  const resolveGroup = (
    contribution: SecurityActionMenuContribution
  ): TGroupId | typeof EXTENSION_GROUP | undefined => {
    if (resolvedGroups.has(contribution.id)) {
      return resolvedGroups.get(contribution.id);
    }

    const configuredGroup = presetGroups.get(contribution.id);
    if (configuredGroup != null) {
      resolvedGroups.set(contribution.id, configuredGroup);
      return configuredGroup;
    }

    const placementTarget = contribution.placement?.before ?? contribution.placement?.after;
    if (placementTarget != null) {
      const targetContribution = contributionsById.get(placementTarget);
      if (targetContribution != null) {
        const targetGroup = resolveGroup(targetContribution);
        resolvedGroups.set(contribution.id, targetGroup);
        return targetGroup;
      }
    }

    const fallbackGroup = preset == null ? undefined : EXTENSION_GROUP;
    resolvedGroups.set(contribution.id, fallbackGroup);
    return fallbackGroup;
  };
  const flattenedItems: SecurityActionMenuContribution['items'] = [];
  let previousGroup: TGroupId | typeof EXTENSION_GROUP | undefined;
  orderedContributions.forEach((contribution) => {
    if (contribution.items.length === 0) {
      return;
    }

    const group = resolveGroup(contribution);
    if (
      flattenedItems.length > 0 &&
      group != null &&
      previousGroup != null &&
      group !== previousGroup
    ) {
      flattenedItems.push({
        isSeparator: true,
        key: `securityActionMenuGroupSeparator-${flattenedItems.length}`,
        'data-test-subj': 'securityActionMenuGroupSeparator',
      });
    }
    flattenedItems.push(...contribution.items);
    previousGroup = group;
  });
  const items = wrapItems(flattenedItems);
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
