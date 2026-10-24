/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { ACTION_TYPE_SOURCES, type ActionType } from '@kbn/actions-types';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

type ActionTypeRegistry = TriggersAndActionsUIPublicPluginStart['actionTypeRegistry'];

export interface SourceCardItem {
  iconClass: IconType;
  name: string;
  description: string;
}

export const getSourceCardItem = ({
  actionType,
  actionTypeRegistry,
}: {
  actionType: ActionType;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'get'>;
}): SourceCardItem => {
  if (actionType.source === ACTION_TYPE_SOURCES.spec) {
    return {
      iconClass: ConnectorIconsMap.get(actionType.id) ?? 'plugs',
      name: actionType.name,
      description: actionType.description ?? '',
    };
  }
  const model = actionTypeRegistry.has(actionType.id)
    ? actionTypeRegistry.get(actionType.id)
    : undefined;
  return {
    iconClass: model?.iconClass ?? 'plugs',
    name: actionType.name,
    description: model?.selectMessage ?? '',
  };
};
