/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, take } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/server';
import { NIGHTSHIFT_METRICS_ENTITIES_FLAG } from '@kbn/nightshift-shared';

interface BooleanFeatureFlagReader {
  getBooleanValue: (flagName: string, fallback: boolean) => Promise<boolean>;
}

/** Returns whether deterministic entity extraction is enabled for metrics sources. */
export const isMetricsEntitiesEnabled = (
  featureFlags: BooleanFeatureFlagReader | FeatureFlagsStart
): Promise<boolean> => {
  if ('getBooleanValue' in featureFlags) {
    return featureFlags.getBooleanValue(NIGHTSHIFT_METRICS_ENTITIES_FLAG, false);
  }
  return lastValueFrom(
    featureFlags.getBooleanValue$(NIGHTSHIFT_METRICS_ENTITIES_FLAG, false).pipe(take(1))
  );
};
