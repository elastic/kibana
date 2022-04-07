/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { Page } from 'playwright';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ecommerceDashboard({ getService }: FtrProviderContext) {
  describe('login', () => {
    it('login', async () => {
      const config = getService('config');
      const inputDelays = getService('inputDelays');
      const performance = getService('performance');

      await performance.runUserJourney(
        'login',
        [
          {
            name: 'Login',
            handler: async ({ page }: { page: Page }) => {
              const kibanaUrl = Url.format({
                protocol: config.get('servers.kibana.protocol'),
                hostname: config.get('servers.kibana.hostname'),
                port: config.get('servers.kibana.port'),
              });

              await page.goto(`${kibanaUrl}`);

              const usernameLocator = page.locator('[data-test-subj=loginUsername]');
              const passwordLocator = page.locator('[data-test-subj=loginPassword]');
              const submitButtonLocator = page.locator('[data-test-subj=loginSubmit]');

              await usernameLocator?.type('elastic', { delay: inputDelays.TYPING });
              await passwordLocator?.type('changeme', { delay: inputDelays.TYPING });
              await submitButtonLocator?.click({ delay: inputDelays.MOUSE_CLICK });

              await page.waitForSelector('#headerUserMenu');
            },
          },
        ],
        true
      );
    });
  });
}
