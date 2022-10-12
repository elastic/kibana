/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { StepCtx } from '../../services/performance';

export default function ({ getService }: FtrProviderContext) {
  // FAILING: https://github.com/elastic/kibana/issues/130287
  describe.skip('many_fields_discover', () => {
    const performance = getService('performance');

    it('many_fields_discover', async () => {
      await performance.runUserJourney(
        'many_fields_discover',
        [
          {
            name: 'Go to Discover Page',
            handler: async ({ page, kibanaUrl }: StepCtx) => {
              await page.goto(`${kibanaUrl}/app/discover`);
              await page.waitForSelector('[data-test-subj="discoverDocTable"]');
            },
          },
          {
            name: 'Expand the first document',
            handler: async ({ page }) => {
              const expandButtons = page.locator('[data-test-subj="docTableExpandToggleColumn"]');
              await expandButtons.first().click();
              await page.locator('text="Expanded document"');
            },
          },
        ],
        {
          requireAuth: false,
        }
      );
    });
  });
}
