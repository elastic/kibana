/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { staticInventoryViewId } from '../inventory_views/defaults';
import { isSchemaAwareNodeType } from './schema_aware_node_types';

/**
 * Preferred schema to seed from a saved Inventory view.
 *
 * The static view stays null until time-range detection hydrates it. A pod only
 * joins that path while the temporary pod schema selector flag is on. While the
 * flag is off, a stored pod schema is left as-is and requests stay on ECS.
 */
export const preferredSchemaForInventoryView = (
  nodeType: InventoryItemType,
  savedViewId: string,
  preferredSchema: DataSchemaFormat | null | undefined,
  isPodSchemaSelectorEnabled: boolean
): DataSchemaFormat | null | undefined => {
  const selectionEnabled =
    isSchemaAwareNodeType(nodeType) && (nodeType !== 'pod' || isPodSchemaSelectorEnabled);

  if (selectionEnabled && savedViewId === staticInventoryViewId) {
    return preferredSchema ?? null;
  }

  return preferredSchema;
};
