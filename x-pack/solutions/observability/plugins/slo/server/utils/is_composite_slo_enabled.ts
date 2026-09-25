/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type {
  FeatureFlagsRequestHandlerContext,
  FeatureFlagsStart,
} from '@kbn/core-feature-flags-server';
import { SLO_COMPOSITE_ENABLED } from '../../common/feature_flags';

export async function isCompositeSloEnabled(
  featureFlags:
    | Pick<FeatureFlagsStart, 'getBooleanValue$'>
    | Pick<FeatureFlagsRequestHandlerContext, 'getBooleanValue'>
): Promise<boolean> {
  if ('getBooleanValue$' in featureFlags) {
    return firstValueFrom(featureFlags.getBooleanValue$(SLO_COMPOSITE_ENABLED, false));
  }

  return featureFlags.getBooleanValue(SLO_COMPOSITE_ENABLED, false);
}
