/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Page } from 'playwright';
import { FtrProviderContext } from '../../ftr_provider_context';
import { StepCtx } from '../../services/performance';
import { waitForVisualizations } from '../../utils';

export default function ({ getService }: FtrProviderContext) {
  describe('ecommerce_dashboard', () => {
    it('ecommerce_dashboard', async () => {
      const performance = getService('performance');
      const logger = getService('log');

      await performance.runUserJourney(
        'ecommerce_dashboard',
        [
          {
            name: 'Go to Sample Data Page',
            handler: async ({ page, kibanaUrl }: StepCtx) => {
              await page.goto(`${kibanaUrl}/app/home#/tutorial_directory/sampleData`);
              await page.waitForSelector('text="More ways to add data"');
            },
          },
          {
            name: 'Add Ecommerce Sample Data',
            handler: async ({ page }: { page: Page }) => {
              const showSampleDataButton = page.locator('[data-test-subj=showSampleDataButton]');
              await showSampleDataButton.click();
              const removeButton = page.locator('[data-test-subj=removeSampleDataSetecommerce]');
              try {
                await removeButton.click({ timeout: 1_000 });
              } catch (e) {
                logger.info('Ecommerce data does not exist');
              }
              const addDataButton = page.locator('[data-test-subj=addSampleDataSetecommerce]');
              if (addDataButton) {
                await addDataButton.click();
              }
            },
          },
          {
            name: 'Go to Ecommerce Dashboard',
            handler: async ({ page }: { page: Page }) => {
              await page.click('[data-test-subj=launchSampleDataSetecommerce]');
              await page.click('[data-test-subj=viewSampleDataSetecommerce-dashboard]');

              await waitForVisualizations(page, 13);
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
