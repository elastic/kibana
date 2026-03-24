/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestAuthFixture, RoleApiCredentials } from '@kbn/scout-oblt';
import { apiTest as baseApiTest, mergeTests } from '@kbn/scout-oblt';
import { synthtraceFixture } from '@kbn/scout-synthtrace';

const NO_ACCESS_ONBOARDING_ROLE = {
  elasticsearch: {
    cluster: [] as string[],
    indices: [] as Array<{ names: string[]; privileges: string[] }>,
  },
  kibana: [] as Array<{
    base: string[];
    feature: Record<string, string[]>;
    spaces: string[];
  }>,
};

export interface OnboardingRequestAuthFixture extends RequestAuthFixture {
  getNoAccessOnboardingApiKey: () => Promise<RoleApiCredentials>;
}

export interface OnboardingApiFixtures {
  requestAuth: OnboardingRequestAuthFixture;
}

export const apiTest = mergeTests(baseApiTest, synthtraceFixture).extend<OnboardingApiFixtures>({
  requestAuth: async ({ requestAuth }, use) => {
    const getNoAccessOnboardingApiKey = async (): Promise<RoleApiCredentials> =>
      requestAuth.getApiKeyForCustomRole(NO_ACCESS_ONBOARDING_ROLE);

    const extended: OnboardingRequestAuthFixture = {
      ...requestAuth,
      getNoAccessOnboardingApiKey,
    };

    await use(extended);
  },
});
