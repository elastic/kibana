/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';

/**
 * Schema an Inventory Threshold rule evaluates, and the flyout preview requests.
 *
 * Pods have no Schema control, so a stored Hosts `semconv` must not query kubeletstats.
 * The stored param is left unchanged, so switching For back to Hosts still shows OpenTelemetry.
 * An omitted host schema stays omitted. Do not substitute `DEFAULT_SCHEMA`: that constant is `semconv`.
 */
export const getInventoryRuleSchema = (
  nodeType: InventoryItemType,
  schema: DataSchemaFormat | null | undefined
): DataSchemaFormat | undefined => {
  if (nodeType === 'pod') {
    return 'ecs';
  }

  return schema ?? undefined;
};
