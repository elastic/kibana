/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';

/**
 * Resolves the Schema Inventory waffle requests should send for the current node type.
 *
 * Schema-aware types (Hosts, Pods) follow `preferredSchema`, falling through to
 * `DEFAULT_SCHEMA` when unset. Other node types behave the same for request
 * wiring; the Schema control itself is still gated in the toolbar.
 */
export const getInventoryRequestSchema = (
  _nodeType: InventoryItemType,
  preferredSchema: DataSchemaFormat | null | undefined
): DataSchemaFormat => {
  return preferredSchema ?? DEFAULT_SCHEMA;
};
