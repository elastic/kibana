/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import type { SecurityActionMenuItemDefinition } from './definitions';

type SecurityActionMenuItem = Extract<EuiContextMenuPanelItemDescriptor, { name: ReactNode }>;

export const isSecurityActionMenuItem = (
  item: EuiContextMenuPanelItemDescriptor
): item is SecurityActionMenuItem => 'name' in item;

export const applySecurityActionMenuItemDefinition = (
  item: EuiContextMenuPanelItemDescriptor,
  definition?: SecurityActionMenuItemDefinition
): EuiContextMenuPanelItemDescriptor => {
  if (!isSecurityActionMenuItem(item) || definition?.icon == null) {
    return item;
  }

  const icon =
    definition.iconColor == null
      ? definition.icon
      : createElement(EuiIcon, {
          type: definition.icon,
          color: definition.iconColor,
          'aria-hidden': true,
        });

  return { ...item, icon };
};

export const applySecurityActionMenuItemMetadata = (
  items: readonly EuiContextMenuPanelItemDescriptor[],
  definitions: Readonly<Record<string, SecurityActionMenuItemDefinition>>
): EuiContextMenuPanelItemDescriptor[] => {
  const definitionsBySourceKey = new Map<string, SecurityActionMenuItemDefinition>(
    Object.values(definitions).flatMap((definition) =>
      definition.sourceKeys.map((sourceKey) => [sourceKey, definition] as const)
    )
  );

  return items.map((item) => {
    if (!isSecurityActionMenuItem(item)) {
      return item;
    }

    const sourceKeys = [item.key, item['data-test-subj']].filter(
      (sourceKey): sourceKey is string => sourceKey != null
    );
    const definition = sourceKeys
      .map((sourceKey) => definitionsBySourceKey.get(sourceKey))
      .find((sourceDefinition) => sourceDefinition != null);

    return applySecurityActionMenuItemDefinition(item, definition);
  });
};
