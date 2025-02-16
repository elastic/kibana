/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { browserAuthFixture } from '@kbn/scout/src/playwright/fixtures/test';

export type SecurityLoginFunction = () => Promise<void>;

export interface SecurityBrowserAuthFixture {
  /**
   * Logs in as a user with a specific security role.
   * @returns A Promise that resolves once the authentication session is set.
   */
  loginAsPlatformEngineer: () => Promise<void>;
}

/**
 * Extends the browserAuth fixture to include security-specific login functionality.
 */
export const securityBrowserAuthFixture = browserAuthFixture.extend<{
  securityBrowserAuth: SecurityBrowserAuthFixture;
}>({
  securityBrowserAuth: async ({ browserAuth, log }, use) => {
    const loginAsPlatformEngineer: SecurityLoginFunction = async () => {
      await browserAuth.loginAs('platform_engineer');
    };

    log.serviceLoaded('securityBrowserAuth');
    await use({ loginAsPlatformEngineer });
  },
});
