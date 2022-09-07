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
  describe('flight_dashboard', () => {
    it('flight_dashboard', async () => {
      const performance = getService('performance');
      const logger = getService('log');

      await performance.runUserJourney(
        'flight_dashboard',
        [
          {
            name: 'Go to Sample Data Page',
            handler: async ({ page, kibanaUrl }: StepCtx) => {
              await page.goto(`${kibanaUrl}/app/home#/tutorial_directory/sampleData`);
              await page.waitForSelector('[data-test-subj=sampleDataSetCardflights]');
            },
          },
          {
            name: 'Add Flights Sample Data',
            handler: async ({ page }) => {
              const showSampleDataButton = page.locator('[data-test-subj=showSampleDataButton]');
              await showSampleDataButton.click();
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

              await waitForVisualizations(page, 15);
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
