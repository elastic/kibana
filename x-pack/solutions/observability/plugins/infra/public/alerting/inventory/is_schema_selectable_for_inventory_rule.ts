/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { isSchemaAwareNodeType } from '../../../common/inventory/schema_aware_node_types';

/**
 * Whether a node type offers the Schema control on the Inventory rule flyout.
 *
 * Matches the Inventory toolbar: Hosts always, Pods only while the temporary pod
 * schema selector flag is on, everything else never.
 */
export const isSchemaSelectableForInventoryRule = (
  nodeType: InventoryItemType | undefined,
  isPodSchemaSelectorEnabled: boolean
): boolean =>
  !!nodeType &&
  isSchemaAwareNodeType(nodeType) &&
  (nodeType !== 'pod' || isPodSchemaSelectorEnabled);
