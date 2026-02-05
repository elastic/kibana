/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after, expect } from '@elastic/synthetics';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics_app';
import { SyntheticsServices } from '../services/synthetics_services';

journey(`CustomTLSAlert`, async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });

  const services = new SyntheticsServices(params);
  const retry: RetryService = params.getService('retry');

  const tlsRuleName = 'synthetics-e2e-monitor-tls-rule';

  let configId: string;

  before(async () => {
    await services.cleanUp();
  });

  after(async () => {
    await services.cleanUp();
  });

  step('Go to monitors page', async () => {
    await syntheticsApp.navigateToOverview(true, 15);
  });

  step('Add test monitor', async () => {
    configId = await services.addTestMonitor(
      'Test Monitor',
      {
        type: 'http',
        urls: 'https://www.google.com',
        locations: ['us_central'],
      },
      configId,
      { tls: { enabled: true } }
    );
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    // Mocking a test summary document for the created monitor with a TLS certificate that expires tomorrow
    await services.addTestSummaryDocument({
      configId,
      tlsNotAfter: tomorrowDate.toISOString(),
      tlsNotBefore: new Date().toISOString(),
    });
  });

  step('Should open the create TLS rule flyout', async () => {
    await page.getByTestId('syntheticsRefreshButtonButton').click();
    await expect(page.getByTestId('syntheticsAlertsRulesButton')).toBeEnabled();
    await page.getByTestId('syntheticsAlertsRulesButton').click();
    await page.getByTestId('manageTlsRuleName').click();
    await page.getByTestId('createNewTLSRule').click();

    await expect(page.getByTestId('addRuleFlyoutTitle')).toBeVisible();
  });

  step('Should filter monitors using the KQL filter bar', async () => {
    // Using the KQL filter to search for a monitor type of "tcp", 0 existing monitors should be found because the type of the test monitor is 'http'
    await page.fill('[data-test-subj="queryInput"]', `monitor.type: "tcp" `);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('syntheticsStatusRuleVizMonitorQueryIDsButton')).toHaveText(
      '0 existing monitors'
    );

    // Set it back to empty string
    await page.fill('[data-test-subj="queryInput"]', '');
    await page.keyboard.press('Enter');
  });

  step('Should filter monitors by type', async () => {
    await page.getByRole('button', { name: 'Type All' }).click();
    await page.getByTestId('monitorTypeField').click();
    await page.getByRole('option', { name: 'http' }).click();
    await page.getByTestId('ruleDefinition').getByRole('button', { name: 'Type http' }).click();
    await expect(page.getByTestId('syntheticsStatusRuleVizMonitorQueryIDsButton')).toHaveText(
      '1 existing monitor'
    );
  });

  step('Should create TLS rule', async () => {
    // This is to check that when the user clicks on the "Create new TLS rule" button, a POST request is made to the API
    let requestMade = false;
    page.on('request', (request) => {
      if (request.url().includes('api/alerting/rule') && request.method() === 'POST') {
        requestMade = true;
      }
    });

    // Setting the rule schedule to 5 seconds so that the alert will be created quickly
    await page.getByTestId('ruleScheduleNumberInput').fill('5');
    await page.getByTestId('ruleScheduleUnitInput').selectOption('seconds');
    await page.getByTestId('ruleFormStep-details').click();
    await page.waitForSelector('[data-test-subj="ruleFlyoutFooterSaveButton"]');
    await page.fill('[data-test-subj="ruleDetailsNameInput"]', tlsRuleName);
    await page.getByTestId('ruleFlyoutFooterSaveButton').click();
    await page.getByTestId('confirmModalConfirmButton').click();

    expect(requestMade).toBe(true);
  });

  step('Verify rule creation', async () => {
    await syntheticsApp.goToRulesPage();
    await page.waitForSelector(`text='${tlsRuleName}'`);
  });

  step('Verify alert creation', async () => {
    await page.getByTestId('observability-nav-observability-overview-alerts').click();

    await retry.tryForTime(5 * 1000, async () => {
      await page.getByTestId('querySubmitButton').click();
      if (!(await page.getByText(tlsRuleName).isVisible())) {
        throw new Error('Alert not found');
      }
    });
  });
});
