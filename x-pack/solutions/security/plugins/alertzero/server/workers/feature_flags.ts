/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { Subscription } from 'rxjs';
import type { WorkerFeatureFlag } from './types';

export interface WorkerFeatureFlagValues {
  get: <T extends boolean | string>(flag: WorkerFeatureFlag<T>) => T;
  followCoreFeatureFlags: (featureFlags: CoreStart['featureFlags']) => Subscription;
}

/**
 * Core's start contract only offers flag observables, so this holds each declared flag's latest
 * value, its fallback until `followCoreFeatureFlags`.
 */
export const createWorkerFeatureFlagValues = (
  flags: readonly WorkerFeatureFlag[]
): WorkerFeatureFlagValues => {
  const values = new Map<string, boolean | string>();
  for (const { key, fallback } of flags) {
    const declared = values.get(key);
    if (declared !== undefined && declared !== fallback) {
      throw new Error(`AlertZero Workers declare feature flag ${key} with different fallbacks`);
    }
    values.set(key, fallback);
  }
  const followedFlags = [...values].map(([key, fallback]) => ({ key, fallback }));

  return {
    get: <T extends boolean | string>({ key }: WorkerFeatureFlag<T>): T => {
      const value = values.get(key);
      if (value === undefined) {
        throw new Error(`Feature flag ${key} is not declared by any AlertZero Worker`);
      }
      // The value comes from the observable matching the declared fallback's type.
      return value as T;
    },
    followCoreFeatureFlags: (featureFlags) => {
      const subscription = new Subscription();
      for (const { key, fallback } of followedFlags) {
        const storeLatestValue = (value: boolean | string) => {
          values.set(key, value);
        };
        subscription.add(
          typeof fallback === 'boolean'
            ? featureFlags.getBooleanValue$(key, fallback).subscribe(storeLatestValue)
            : featureFlags.getStringValue$(key, fallback).subscribe(storeLatestValue)
        );
      }
      return subscription;
    },
  };
};
