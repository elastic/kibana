/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function promotionTrackingDashboard({ getService }: FtrProviderContext) {
  describe('promotion_tracking_dashboard', () => {
    const config = getService('config');
    const performance = getService('performance');
    const esArchiver = getService('esArchiver');
    const kibanaServer = getService('kibanaServer');

    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/performance/kbn_archives/promotion_tracking_dashboard'
      );
      await esArchiver.loadIfNeeded('x-pack/test/performance/es_archives/ecommerce_sample_data');
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/performance/kbn_archives/promotion_tracking_dashboard'
      );
      await esArchiver.unload('x-pack/test/performance/es_archives/ecommerce_sample_data');
    });

    it('promotion_tracking_dashboard', async () => {
      await performance.runUserJourney(
        'promotion_tracking_dashboard',
        [
          {
            name: 'Go to Dashboards Page',
            handler: async ({ page }) => {
              const kibanaUrl = Url.format({
                protocol: config.get('servers.kibana.protocol'),
                hostname: config.get('servers.kibana.hostname'),
                port: config.get('servers.kibana.port'),
              });

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
              await page.waitForFunction(() => {
                const visualizations = Array.from(
                  document.querySelectorAll('[data-rendering-count]')
                );
                const visualizationElementsLoaded = visualizations.length > 0;
                const visualizationAnimationsFinished = visualizations.every(
                  (e) => e.getAttribute('data-render-complete') === 'true'
                );
                return visualizationElementsLoaded && visualizationAnimationsFinished;
              });
            },
          },
        ],
        false
      );
    });
  });
}
