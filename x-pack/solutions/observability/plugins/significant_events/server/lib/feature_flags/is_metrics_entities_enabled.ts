/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsRequestHandlerContext } from '@kbn/core-feature-flags-server';
import { NIGHTSHIFT_METRICS_ENTITIES_FLAG } from '@kbn/nightshift-shared';

/** Returns whether deterministic entity extraction is enabled for metrics sources. */
export const isMetricsEntitiesEnabled = (
  featureFlags: FeatureFlagsRequestHandlerContext
): Promise<boolean> => featureFlags.getBooleanValue(NIGHTSHIFT_METRICS_ENTITIES_FLAG, false);
