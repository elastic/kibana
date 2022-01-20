/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function flightDashboard({ getService }: FtrProviderContext) {
  describe('Flights Dashboard', () => {
    const config = getService('config');
    const playwright = getService('playwright');
    const logger = getService('log');
    const { page } = playwright.makePage({ autoLogin: true, journeyName: 'flights_dashboard' });

    it('Go to Sample Data Page', async () => {
      const kibanaUrl = Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
        port: config.get('servers.kibana.port'),
      });

      await page.goto(`${kibanaUrl}/app/home#/tutorial_directory/sampleData`);
      await page.waitForSelector('text="More ways to add data"');
    });

    it('Add Flights Sample Data', async () => {
      const removeButton = page.locator('[data-test-subj=removeSampleDataSetflights]');
      try {
        await removeButton.click({ timeout: 1_000 });
      } catch (e) {
        logger.info('Flights data does not exist');
      }

      const addDataButton = page.locator('[data-test-subj=addSampleDataSetflights]');
      if (addDataButton) {
        await addDataButton.click();
      }
    });

    it('Go to Flights Dashboard', async () => {
      const viewdataBtn = page.locator('[aria-label="View Sample flight data"]');
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

    it('Go to Airport Connections Visualizations Edit', async () => {
      const editButton = page.locator('[data-test-subj="dashboardEditMode"]');
      await editButton.click();

      const flightAirportConnectionsOptionsButton = page.locator(
        '[aria-label="Panel options for [Flights] Airport Connections (Hover Over Airport)"]'
      );
      await flightAirportConnectionsOptionsButton.click();

      const editVisualization = page.locator('text="Edit Visualization"');
      await editVisualization.click();

      await page.waitForFunction(() => {
        const visualization = document.querySelector('[data-rendering-count]');
        return visualization && visualization?.getAttribute('data-render-complete') === 'true';
      });
    });
  });
}
