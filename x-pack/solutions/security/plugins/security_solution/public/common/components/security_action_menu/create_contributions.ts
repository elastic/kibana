/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import {
  applySecurityActionMenuItemDefinition,
  applySecurityActionMenuItemMetadata,
  isSecurityActionMenuItem,
} from './shared_actions';
import type { SecurityActionMenuItemDefinition } from './shared_actions';
import type { SecurityActionMenuContribution } from './types';

export interface SecurityActionMenuSourceDefinition<TActionId extends string> {
  actionIds: readonly TActionId[];
  contributionMode?: 'single' | 'perItem';
}

export interface SecurityActionMenuDefinition<TActionId extends string, TSourceId extends string> {
  actions: Readonly<Record<string, SecurityActionMenuItemDefinition>>;
  sources: Readonly<Record<TSourceId, SecurityActionMenuSourceDefinition<TActionId>>>;
}

export interface SecurityActionMenuSourceInput {
  items: readonly EuiContextMenuPanelItemDescriptor[];
  panels?: readonly EuiContextMenuPanelDescriptor[];
  visibleWhen?: ReadonlyArray<boolean | null | undefined>;
}

export type SecurityActionMenuSourceInputs<TSourceId extends string> = Partial<
  Record<TSourceId, SecurityActionMenuSourceInput>
>;

const createActionIdsBySourceKey = <TActionId extends string>(
  actions: Readonly<Record<string, SecurityActionMenuItemDefinition>>
): Map<string, TActionId> =>
  new Map(
    Object.entries(actions).flatMap(([actionId, { sourceKeys }]) =>
      sourceKeys.map((sourceKey) => [sourceKey, actionId as TActionId] as const)
    )
  );

export const createSecurityActionMenuContributions = <
  TActionId extends string,
  TSourceId extends string
>(
  definition: SecurityActionMenuDefinition<TActionId, TSourceId>,
  inputs: SecurityActionMenuSourceInputs<TSourceId>
): Array<SecurityActionMenuContribution<TActionId>> => {
  const actionIdsBySourceKey = createActionIdsBySourceKey<TActionId>(definition.actions);

  return (Object.entries(inputs) as Array<[TSourceId, SecurityActionMenuSourceInput]>).flatMap(
    ([sourceId, { items, panels, visibleWhen = [] }]) => {
      if (!visibleWhen.every(Boolean) || items.length === 0) {
        return [];
      }

      const { actionIds, contributionMode = 'perItem' } = definition.sources[sourceId];

      if (contributionMode === 'single') {
        if (actionIds.length !== 1) {
          throw new Error(
            `Security action menu source "${sourceId}" must define exactly one action in single mode`
          );
        }

        return [
          {
            id: actionIds[0],
            items: applySecurityActionMenuItemMetadata(items, definition.actions),
            ...(panels == null ? {} : { panels: [...panels] }),
          },
        ];
      }

      const allowedActionIds = new Set<string>(actionIds);

      return items.map((item, index) => {
        if (!isSecurityActionMenuItem(item)) {
          throw new Error(
            `Security action menu source "${sourceId}" must contain standard menu items in per-item mode`
          );
        }

        const sourceKey = item.key ?? item['data-test-subj'];
        const matchedActionId =
          sourceKey == null ? undefined : actionIdsBySourceKey.get(String(sourceKey));
        const actionId =
          matchedActionId != null && allowedActionIds.has(matchedActionId)
            ? matchedActionId
            : actionIds[index];

        if (actionId == null) {
          throw new Error(
            `Security action menu item "${String(
              sourceKey
            )}" is not defined for source "${sourceId}"`
          );
        }

        return {
          id: actionId,
          items: [applySecurityActionMenuItemDefinition(item, definition.actions[actionId])],
          ...(index === 0 && panels != null ? { panels: [...panels] } : {}),
        };
      });
    }
  );
};
