/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { StepCtx } from '../../services/performance';
import { waitForVisualizations } from '../../utils';

export default function ({ getService }: FtrProviderContext) {
  describe('weblogs_dashboard', () => {
    it('weblogs_dashboard', async () => {
      const performance = getService('performance');
      const logger = getService('log');

      await performance.runUserJourney(
        'weblogs_dashboard',
        [
          {
            name: 'Go to Sample Data Page',
            handler: async ({ page, kibanaUrl }: StepCtx) => {
              await page.goto(`${kibanaUrl}/app/home#/tutorial_directory/sampleData`);
              await page.waitForSelector('text="More ways to add data"');
            },
          },
          {
            name: 'Add Web Logs Sample Data',
            handler: async ({ page }) => {
              const showSampleDataButton = page.locator('[data-test-subj=showSampleDataButton]');
              await showSampleDataButton.click();
              const removeButton = page.locator('[data-test-subj=removeSampleDataSetlogs]');
              try {
                await removeButton.click({ timeout: 1_000 });
              } catch (e) {
                logger.info('Weblogs data does not exist');
              }

              const addDataButton = page.locator('[data-test-subj=addSampleDataSetlogs]');
              if (addDataButton) {
                await addDataButton.click();
              }
            },
          },
          {
            name: 'Go to Web Logs Dashboard',
            handler: async ({ page }) => {
              await page.click('[data-test-subj=launchSampleDataSetlogs]');
              await page.click('[data-test-subj=viewSampleDataSetlogs-dashboard]');

              await waitForVisualizations(page, 12);
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
