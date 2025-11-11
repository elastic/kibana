/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout-security';
import { API_BASE_PATH } from '@kbn/license-management-plugin/common/constants';

spaceTest.describe.skip('AI Assistant - Basic License', { tag: ['@ess'] }, () => {
  spaceTest.beforeEach(async ({ browserAuth, page, config }) => {
    await browserAuth.loginAsAdmin();

    // Use page.request to make API calls with browser's authenticated session
    const response = await page.request.post(
      `${config.hosts.kibana}${API_BASE_PATH}/start_basic?acknowledge=true`,
      {
        headers: {
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'security-solution',
        },
      }
    );

    if (!response.ok()) {
      throw new Error(
        `Failed to start basic license: ${response.status()} ${response.statusText()}`
      );
    }
  });

  spaceTest(
    'user with Basic license should not be able to use assistant',
    async ({ page, pageObjects }) => {
      // Navigate to page after license is already changed
      await page.gotoApp('security', { path: '/get_started' });
      await pageObjects.assistantPage.open();

      // Verify upgrade callout is visible
      await pageObjects.assistantPage.assertions.expectUpgradeCallout();

      // Verify conversation is read-only
      await pageObjects.assistantPage.assertions.expectConversationReadOnly();
    }
  );
});
