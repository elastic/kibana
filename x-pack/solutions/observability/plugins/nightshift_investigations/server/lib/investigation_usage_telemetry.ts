/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorTelemetryMetadata } from '@kbn/inference-common';
import {
  NIGHTSHIFT_INVESTIGATION_USAGE_ID,
  NIGHTSHIFT_USAGE_PARENT_ID,
  NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
  NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
} from '@kbn/nightshift-shared';

/** Attributes model spend made on an investigation's behalf, outside its own agent run. */
export const createInvestigationUsageTelemetry = (
  interactionId: string
): ConnectorTelemetryMetadata => ({
  pluginId: NIGHTSHIFT_INVESTIGATION_USAGE_ID,
  aggregateBy: NIGHTSHIFT_USAGE_PARENT_ID,
  productSolution: NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
  productFeature: NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
  interactionId,
});
