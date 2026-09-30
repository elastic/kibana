/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';

export interface DetailTimeRangeMetadata {
  schemas: DataSchemaFormat[];
  preferredSchema: DataSchemaFormat | null;
}

/**
 * Schema for the pod Metric Detail page.
 *
 * Matches Asset Details: trust the URL only when more than one schema is in
 * the time range. Pods are schema-aware, so a leftover Hosts `semconv` URL is
 * honored when detection supports it. `undefined` means the request has not
 * resolved yet, or the server should keep today's default (ECS).
 */
export const resolveDetailSchema = ({
  urlSchema,
  timeRangeMetadata,
  nodeType: _nodeType,
}: {
  urlSchema?: DataSchemaFormat | null;
  timeRangeMetadata?: DetailTimeRangeMetadata | null;
  nodeType: InventoryItemType;
}): DataSchemaFormat | undefined => {
  if (!timeRangeMetadata) {
    return undefined;
  }

  if (timeRangeMetadata.schemas.length > 1 && urlSchema) {
    return urlSchema;
  }

  return timeRangeMetadata.preferredSchema ?? undefined;
};
