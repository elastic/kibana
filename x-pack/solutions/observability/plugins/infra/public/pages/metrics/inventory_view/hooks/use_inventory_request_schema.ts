/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { useIsPodSchemaSelectorEnabled } from '../../../../hooks/use_is_pod_schema_selector_enabled';
import { getInventoryRequestSchema } from '../lib/get_inventory_request_schema';

/** Schema Inventory waffle, timeline, and tooltip requests should send. */
export const useInventoryRequestSchema = (
  nodeType: InventoryItemType,
  preferredSchema: DataSchemaFormat | null | undefined
): DataSchemaFormat => {
  const isPodSchemaSelectorEnabled = useIsPodSchemaSelectorEnabled();
  return getInventoryRequestSchema(nodeType, preferredSchema, { isPodSchemaSelectorEnabled });
};
