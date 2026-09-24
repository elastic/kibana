/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';

export interface GetInventoryRequestSchemaOptions {
  isPodSchemaSelectorEnabled?: boolean;
}

/**
 * Resolves the Schema Inventory waffle requests should send for the current node type.
 *
 * When the pod schema selector flag is off, leftover Hosts preferredSchema must not
 * query kubeletstats. Do not fall through to DEFAULT_SCHEMA for that coerce: that
 * constant is `semconv`.
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
