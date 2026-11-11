/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-types';

export type SubscriptionAvailability = 'loading' | 'available' | 'license' | 'serverless_tier';

/** Resolves subscription eligibility independently of space enablement and user privileges. */
export const getSubscriptionAvailability = ({
  isServerless,
  serverlessTierAvailable,
  license,
}: {
  isServerless: boolean;
  serverlessTierAvailable: boolean;
  license?: ILicense;
}): SubscriptionAvailability => {
  if (isServerless) {
    return serverlessTierAvailable ? 'available' : 'serverless_tier';
  }
  if (!license) {
    return 'loading';
  }
  return license.isAvailable && license.isActive && license.hasAtLeast('enterprise')
    ? 'available'
    : 'license';
};
