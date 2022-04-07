/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { Page } from 'playwright';
import { ToolingLog } from '@kbn/dev-utils';
import { Config } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';
import { Steps } from '../../services/performance';

function getEcommerceSteps(config: Config, logger: ToolingLog): Steps {
  return [
    {
      name: 'Go to Sample Data Page',
      handler: async ({ page }: { page: Page }) => {
        const kibanaUrl = Url.format({
          protocol: config.get('servers.kibana.protocol'),
          hostname: config.get('servers.kibana.hostname'),
          port: config.get('servers.kibana.port'),
        });

        await page.goto(`${kibanaUrl}/app/home#/tutorial_directory/sampleData`);
        await page.waitForSelector('text="More ways to add data"');
      },
    },
    {
      name: 'Add Ecommerce Sample Data',
      handler: async ({ page }: { page: Page }) => {
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

        await page.waitForFunction(() => {
          const visualizations = Array.from(document.querySelectorAll('[data-rendering-count]'));
          const visualizationElementsLoaded = visualizations.length > 0;
          const visualizationAnimationsFinished = visualizations.every(
            (e) => e.getAttribute('data-render-complete') === 'true'
          );
          return visualizationElementsLoaded && visualizationAnimationsFinished;
        });
      },
    },
  ];
}

export default function ecommerceDashboard({ getService }: FtrProviderContext) {
  describe('ecommerce_dashboard', () => {
    it('ecommerce_dashboard', async () => {
      const config = getService('config');
      const performance = getService('performance');
      const logger = getService('log');

      await performance.runUserJourney(
        'ecommerce_dashboard',
        getEcommerceSteps(config, logger),
        false
      );
    });
  });
}
