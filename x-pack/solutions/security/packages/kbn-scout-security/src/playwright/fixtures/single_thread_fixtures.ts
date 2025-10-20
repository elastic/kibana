/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, UserProfilesFixture } from '@kbn/scout';
import { test as baseTest, mergeTests, userProfilesFixture } from '@kbn/scout';
import type {
  SecurityApiServicesFixture,
  SecurityTestFixtures,
  SecurityWorkerFixtures,
} from './types';
import {
  getDetectionRuleApiService,
  getAssistantCleanupService,
  getBrowserScopedAssistantService,
  getConnectorsApiService,
} from './worker';
import { extendPageObjects, securityBrowserAuthFixture } from './test';

const securityFixtures = mergeTests(baseTest, securityBrowserAuthFixture, userProfilesFixture);

export const test = securityFixtures.extend<SecurityTestFixtures, SecurityWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: { pageObjects: SecurityTestFixtures['pageObjects']; page: SecurityTestFixtures['page'] },
    use: (pageObjects: SecurityTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        log,
        esClient,
        userProfiles,
        config,
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: SecurityWorkerFixtures['kbnClient'];
        log: SecurityWorkerFixtures['log'];
        esClient: SecurityWorkerFixtures['esClient'];
        userProfiles: UserProfilesFixture;
        config: SecurityWorkerFixtures['config'];
      },
      use: (extendedApiServices: SecurityApiServicesFixture) => Promise<void>
    ) => {
      // Auto-activate user profile for the test user to ensure profile_uid is available
      // This is critical for features like Elastic AI Assistant that require user profiles
      log.debug('[API SERVICES] Starting user profile activation...');
      log.debug(`[API SERVICES] Username: ${config.auth.username}`);
      let currentUserUid: string | undefined;
      try {
        log.debug('[API SERVICES] Calling userProfiles.activateUserProfile...');
        const userProfile = await userProfiles.activateUserProfile(
          config.auth.username,
          config.auth.password
        );
        log.debug(`[API SERVICES] Profile activation response: ${JSON.stringify(userProfile)}`);
        currentUserUid = userProfile.uid;
        log.debug(`[API SERVICES] User profile activated with UID: ${currentUserUid}`);
      } catch (err) {
        const error = err as Error;
        log.error(`[API SERVICES] Failed to activate user profile for ${config.auth.username}`);
        log.error(`[API SERVICES] Error: ${error?.message || err}`);
        log.error(`[API SERVICES] Error stack: ${error?.stack}`);
      }

      log.debug(`[API SERVICES] Final currentUserUid value: ${currentUserUid}`);

      const extendedApiServices = apiServices as SecurityApiServicesFixture;
      extendedApiServices.detectionRule = getDetectionRuleApiService({
        kbnClient,
        log,
        esClient,
      });
      extendedApiServices.assistant = getAssistantCleanupService({
        esClient,
      });
      extendedApiServices.connectors = getConnectorsApiService({
        kbnClient,
        log,
      });

      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
  browserScopedApis: async ({ page }: { page: SecurityTestFixtures['page'] }, use) => {
    await use({
      assistant: getBrowserScopedAssistantService({ page }),
    });
  },
});
