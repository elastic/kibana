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
 */
export const getInventoryRequestSchema = (
  nodeType: InventoryItemType,
  preferredSchema: DataSchemaFormat | null | undefined
): DataSchemaFormat => {
  // Leftover Hosts preferredSchema must not query kubeletstats until the pod toolbar owns Schema (#291416).
  // Do not fall through to DEFAULT_SCHEMA here: that constant is `semconv`.
  if (nodeType === 'pod') {
    return 'ecs';
  }

  return preferredSchema ?? DEFAULT_SCHEMA;
};
