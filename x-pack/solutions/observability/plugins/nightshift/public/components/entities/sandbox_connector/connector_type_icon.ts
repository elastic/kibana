/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

type ActionTypeRegistry = TriggersAndActionsUIPublicPluginStart['actionTypeRegistry'];

export const getConnectorTypeIcon = (
  typeId: string,
  registry: Pick<ActionTypeRegistry, 'has' | 'get'> | undefined
): IconType =>
  ConnectorIconsMap.get(typeId) ??
  (registry?.has(typeId) ? registry.get(typeId).iconClass : undefined) ??
  'plugs';
