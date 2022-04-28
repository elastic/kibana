/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { StepCtx } from '../../services/performance';

export default function ecommerceDashboard({ getService }: FtrProviderContext) {
  describe('login', () => {
    it('login', async () => {
      const inputDelays = getService('inputDelays');
      const performance = getService('performance');

      await performance.runUserJourney(
        'login',
        [
          {
            name: 'Login',
            handler: async ({ page, kibanaUrl }: StepCtx) => {
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
        {
          requireAuth: true,
        }
      );
    });
  });
}
