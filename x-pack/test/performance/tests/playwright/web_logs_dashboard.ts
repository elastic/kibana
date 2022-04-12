/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function weblogDashboard({ getService }: FtrProviderContext) {
  describe('weblogs_dashboard', () => {
    const config = getService('config');
    const performance = getService('performance');
    const logger = getService('log');
    const { step } = performance.makePage('weblogs_dashboard');

    step('Go to Sample Data Page', async ({ page }) => {
      const kibanaUrl = Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
        port: config.get('servers.kibana.port'),
      });

      await page.goto(`${kibanaUrl}/app/home#/tutorial_directory/sampleData`);
      await page.waitForSelector('text="More ways to add data"');
    });

    step('Add Web Logs Sample Data', async ({ page }) => {
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
    });

    step('Go to Web Logs Dashboard', async ({ page }) => {
      await page.click('[data-test-subj=launchSampleDataSetlogs]');
      await page.click('[data-test-subj=viewSampleDataSetlogs-dashboard]');

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
