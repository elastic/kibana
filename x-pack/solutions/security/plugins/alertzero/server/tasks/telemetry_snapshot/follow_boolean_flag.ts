/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/server';

/** A boolean feature flag followed until `stop`, so every read returns its current value. */
export interface FollowedBooleanFlag {
  getValue: () => boolean;
  stop: () => void;
}

/** Subscribes to a boolean feature flag for as long as its reads should follow it. */
export const followBooleanFlag = ({
  fallbackValue,
  featureFlags,
  flagName,
}: {
  fallbackValue: boolean;
  featureFlags: Pick<FeatureFlagsStart, 'getBooleanValue$'>;
  flagName: string;
}): FollowedBooleanFlag => {
  const value$ = new BehaviorSubject(fallbackValue);
  const subscription = featureFlags
    .getBooleanValue$(flagName, fallbackValue)
    .subscribe((value) => value$.next(value));

  return {
    getValue: () => value$.getValue(),
    stop: () => subscription.unsubscribe(),
  };
};
