/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserAuthFixture } from '@kbn/scout/src/playwright/fixtures/test';

export async function extendBrowserAuth(browserAuth: BrowserAuthFixture) {
  const extendedAuth = {
    ...browserAuth,
    loginAsPlatformEngineer: async () => {
      await browserAuth.loginAs('platform_engineer');
    },
  };

  return extendedAuth;
}
