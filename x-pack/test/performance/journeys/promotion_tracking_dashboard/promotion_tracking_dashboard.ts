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
  describe('promotion_tracking_dashboard', () => {
    const performance = getService('performance');

    it('promotion_tracking_dashboard', async () => {
      await performance.runUserJourney(
        'promotion_tracking_dashboard',
        [
          {
            name: 'Go to Dashboards Page',
            handler: async ({ page, kibanaUrl }: StepCtx) => {
              await page.goto(`${kibanaUrl}/app/dashboards`);
              await page.waitForSelector('#dashboardListingHeading');
            },
          },
          {
            name: 'Go to Promotion Tracking Dashboard',
            handler: async ({ page }) => {
              const promotionDashboardButton = page.locator(
                '[data-test-subj="dashboardListingTitleLink-Promotion-Dashboard"]'
              );
              await promotionDashboardButton.click();
            },
          },
          {
            name: 'Change time range',
            handler: async ({ page }) => {
              const beginningTimeRangeButton = page.locator(
                '[data-test-subj="superDatePickerToggleQuickMenuButton"]'
              );
              await beginningTimeRangeButton.click();

              const lastYearButton = page.locator(
                '[data-test-subj="superDatePickerCommonlyUsed_Last_30 days"]'
              );
              await lastYearButton.click();
            },
          },
          {
            name: 'Wait for visualization animations to finish',
            handler: async ({ page }) => {
              await waitForVisualizations(page, 1);
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
