/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { ToolingLog } from '@kbn/dev-utils';
import { Config } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';
import { Steps } from '../../services/performance';

function getFlightDashboardSteps(config: Config, logger: ToolingLog): Steps {
  return [
    {
      name: 'Go to Sample Data Page',
      handler: async ({ page }) => {
        const kibanaUrl = Url.format({
          protocol: config.get('servers.kibana.protocol'),
          hostname: config.get('servers.kibana.hostname'),
          port: config.get('servers.kibana.port'),
        });

        await page.goto(`${kibanaUrl}/app/home#/tutorial_directory/sampleData`);
        await page.waitForSelector('[data-test-subj=sampleDataSetCardflights]');
      },
    },
    {
      name: 'Add Flights Sample Data',
      handler: async ({ page }) => {
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
      },
    },
    {
      name: 'Go to Flights Dashboard',
      handler: async ({ page }) => {
        await page.click('[data-test-subj=launchSampleDataSetflights]');
        await page.click('[data-test-subj=viewSampleDataSetflights-dashboard]');

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
    {
      name: 'Go to Airport Connections Visualizations Edit',
      handler: async ({ page }) => {
        await page.click('[data-test-subj="dashboardEditMode"]');

        const flightsPanelHeadingSelector = `[data-test-subj="embeddablePanelHeading-[Flights]AirportConnections(HoverOverAirport)"]`;
        const panelToggleMenuIconSelector = `[data-test-subj="embeddablePanelToggleMenuIcon"]`;

        await page.click(`${flightsPanelHeadingSelector} ${panelToggleMenuIconSelector}`);

        await page.click('[data-test-subj="embeddablePanelAction-editPanel"]');

        await page.waitForFunction(() => {
          const visualization = document.querySelector('[data-rendering-count]');
          return visualization && visualization?.getAttribute('data-render-complete') === 'true';
        });
      },
    },
  ];
}

export default function flightDashboard({ getService }: FtrProviderContext) {
  describe('flight_dashboard', () => {
    it('flight_dashboard', async () => {
      const config = getService('config');
      const performance = getService('performance');
      const logger = getService('log');

      await performance.runUserJourney(
        'flight_dashboard',
        getFlightDashboardSteps(config, logger),
        false
      );
    });
  });
}
