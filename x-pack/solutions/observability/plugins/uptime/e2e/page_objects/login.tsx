/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Page } from '@elastic/synthetics';
import { waitForLoadingToFinish } from '@kbn/ux-plugin/e2e/journeys/utils';

export function loginPageProvider({
  page,
  isRemote = false,
  username = 'elastic',
  password = 'changeme',
}: {
  page: Page;
  isRemote?: boolean;
  username?: string;
  password?: string;
}) {
  return {
    async waitForLoadingToFinish() {
      await waitForLoadingToFinish({ page });
    },
    async loginToKibana(usernameT?: 'editor' | 'viewer', passwordT?: string) {
      if (isRemote) {
        await page.click('text="Log in with Elasticsearch"');
      }
      await page.fill('[data-test-subj=loginUsername]', usernameT ?? username, {
        timeout: 60 * 1000,
      });
      await page.fill('[data-test-subj=loginPassword]', passwordT ?? password);

      await page.click('[data-test-subj=loginSubmit]');

      try {
        while (await page.isVisible('[data-test-subj=loginSubmit]')) {
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        // ignore
      }

      await waitForLoadingToFinish({ page });
    },
  };
}
