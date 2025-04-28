/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-oblt';

export interface OnboardingApiService {
  updateInstallationStepStatus: (
    onboardingId: string,
    step: string,
    status: string,
    payload?: object
  ) => Promise<void>;
}

export const getOnboardingApiHelper = (kbnClient: KbnClient) => {
  return {
    updateInstallationStepStatus: async (
      onboardingId: string,
      step: string,
      status: string,
      payload?: object
    ) => {
      await kbnClient.request({
        method: 'POST',
        path: `/internal/observability_onboarding/flow/${onboardingId}/step/${step}`,
        body: {
          status,
          payload,
        },
      });
    },
  };
};
