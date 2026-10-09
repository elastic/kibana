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
 * Rule-UI alias for `isSchemaAwareNodeType` plus an undefined guard so the
 * flyout can pass `ruleParams.nodeType` before it is set. Keep this name at
 * the expression boundary so Inventory toolbar and rule flyout share one
 * policy without the flyout importing inventory view helpers.
 */
export const isSchemaSelectableForInventoryRule = (
  nodeType: InventoryItemType | undefined
): boolean => !!nodeType && isSchemaAwareNodeType(nodeType);
