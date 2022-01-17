/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ecommerceDashboard({ getService }: FtrProviderContext) {
  describe('Ecommerce Dashboard', () => {
    const config = getService('config');
    const playwright = getService('playwright');
    const { page } = playwright.makePage({ autoLogin: true, journeyName: 'ecommerce_dashboard' });

    it('Go to Sample Data Page', async () => {
      const kibanaUrl = Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
        port: config.get('servers.kibana.port'),
      });

      await page.goto(`${kibanaUrl}/app/home#/tutorial_directory/sampleData`);
      await page.waitForSelector('text="More ways to add data"');
    });

    it('Add Ecommerce Sample Data', async () => {
      const removeBtn = await page.locator('[data-test-subj=removeSampleDataSetecommerce]');
      if (removeBtn) {
        await removeBtn.click();
      }

      const addDataBtn = page.locator('[data-test-subj=addSampleDataSetecommerce]');
      await addDataBtn.click();
    });

    it('Go to Ecommerce Dashboard', async () => {
      const viewdataBtn = page.locator('[aria-label="View Sample eCommerce orders"]');
      await viewdataBtn.click();
      const dashboardBtn = page.locator('text="Dashboard"');
      await dashboardBtn.click();

      await page.waitForFunction(() => {
        const visualizations = Array.from(document.querySelectorAll('[data-rendering-count]'));
        const visualizationElementsLoaded = visualizations.length > 0;
        const visualizationAnimationsFinished = visualizations.every(
          (e) => e.getAttribute('data-render-complete') === 'true'
        );
        return visualizationElementsLoaded && visualizationAnimationsFinished;
      });
    });
  });
}
