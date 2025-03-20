/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after, expect } from '@elastic/synthetics';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics_app';
import { SyntheticsServices } from '../services/synthetics_services';

journey(`CustomTLSAlert`, async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });

  const services = new SyntheticsServices(params);

  const firstCheckTime = new Date().toISOString();

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
    await services.addTestSummaryDocument({ timestamp: firstCheckTime, configId });
  });

  step('Should open the create TLS rule flyout', async () => {
    await page.getByTestId('syntheticsRefreshButtonButton').click();
    await page.getByTestId('syntheticsAlertsRulesButton').click();
    await page.getByTestId('manageTlsRuleName').click();
    await page.getByTestId('createNewTLSRule').click();

    await expect(page.getByTestId('addRuleFlyoutTitle')).toBeVisible();
  });

  step('Should filter monitors by type', async () => {
    await page.getByRole('button', { name: 'Type All' }).click();
    await page.getByTestId('comboBoxInput').click();
    await page.getByRole('option', { name: 'http' }).click();
    await page.getByTestId('ruleDefinition').getByRole('button', { name: 'Type http' }).click();
    await expect(page.getByTestId('syntheticsRuleVizMonitorQueryIDsButton')).toHaveText(
      '1 existing monitor'
    );
  });

  step('Should filter monitors using the KQL filter bar', async () => {
    // Using the KQL filter to search for a monitor type of "tcp", 0 existing monitors should be found because the type of the test monitor is 'http'
    await page.fill('[data-test-subj="queryInput"]', `monitor.type: "tcp" `);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('syntheticsRuleVizMonitorQueryIDsButton')).toHaveText(
      '0 existing monitors'
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
});
