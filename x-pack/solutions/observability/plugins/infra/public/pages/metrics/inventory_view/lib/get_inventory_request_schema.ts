/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';

export interface GetInventoryRequestSchemaOptions {
  /**
   * Temporary release gate. While it is off, pod requests stay on ECS so a
   * leftover Hosts `preferredSchema` cannot query kubeletstats.
   */
  isPodSchemaSelectorEnabled?: boolean;
}

/**
 * Resolves the Schema Inventory waffle requests should send for the current node type.
 *
 * Do not fall through to `DEFAULT_SCHEMA` for the pod coerce: that constant is `semconv`.
 */
export const getInventoryRequestSchema = (
  nodeType: InventoryItemType,
  preferredSchema: DataSchemaFormat | null | undefined,
  options?: GetInventoryRequestSchemaOptions
): DataSchemaFormat => {
  if (nodeType === 'pod' && !options?.isPodSchemaSelectorEnabled) {
    return 'ecs';
  }

  return preferredSchema ?? DEFAULT_SCHEMA;
};
