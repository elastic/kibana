/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout-oblt';

export interface OnboardingApiFixture {
  updateInstallationStepStatus: (
    onboardingId: string,
    step: string,
    status: string,
    payload?: object
  ) => Promise<void>;
}

/**
 * This fixture provides a helper to interact with the Observability Onboarding API.
 */
export const onboardingApiFixture = base.extend<{}, { onboardingApi: OnboardingApiFixture }>({
  onboardingApi: [
    async ({ kbnClient, log }, use) => {
      const onboardingApiHelper: OnboardingApiFixture = {
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

      log.serviceLoaded('onboardingApi');
      await use(onboardingApiHelper);
    },
    { scope: 'worker' },
  ],
});
