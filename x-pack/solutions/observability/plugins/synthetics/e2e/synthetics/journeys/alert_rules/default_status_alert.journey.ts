/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after, expect } from '@elastic/synthetics';
import { byTestId } from '@kbn/ux-plugin/e2e/journeys/utils';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { v4 as uuidv4 } from 'uuid';
import { getReasonMessage } from '@kbn/synthetics-plugin/server/alert_rules/status_rule/message_utils';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics_app';
import { SyntheticsServices } from '../services/synthetics_services';

journey(`DefaultStatusAlert`, async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });

  const services = new SyntheticsServices(params);

  const getService = params.getService;
  const retry: RetryService = getService('retry');

  const firstCheckTime = new Date(Date.now()).toISOString();
  let downCheckTime = new Date(Date.now()).toISOString();

  let configId: string;
  let configId2: string;

  before(async () => {
    await services.cleaUp();
  });

  after(async () => {
    await services.cleaUp();
  });

  step('setup monitor', async () => {
    const connectorId = await services.setupTestConnector();
    await services.setupSettings(connectorId.id);

    configId = await services.addTestMonitor('Test Monitor', {
      type: 'http',
      urls: 'https://www.google.com',
      locations: [
        { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
      ],
    });
    await services.addTestSummaryDocument({
      timestamp: firstCheckTime,
      configId,
    });
  });

  step('Go to monitors page', async () => {
    await syntheticsApp.navigateToOverview(true, 15);
  });

  step('should create default status alert', async () => {
    await page.getByTestId('syntheticsAlertsRulesButton').click();
    await page.getByTestId('manageStatusRuleName').click();
    await page.isDisabled(byTestId('editDefaultStatusRule'));
    await page.getByTestId('editDefaultStatusRule').click();

    await page.waitForSelector('text=Monitor status rule');
    await page.getByTestId('intervalInputUnit').selectOption('second');
    await page.getByTestId('intervalInput').fill('20');
    await page.click(byTestId('saveEditedRuleButton'));
    await page.waitForSelector("text=Updated 'Synthetics status internal rule'");
  });

  step('Monitor is as up in overview page', async () => {
    await retry.tryForTime(90 * 1000, async () => {
      const totalUp = await page.textContent(byTestId('syntheticsOverviewUp'));
      expect(totalUp).toBe('1Up');
    });

    await page.hover('text=Test Monitor');
    await page.click('[aria-label="Open actions menu"]');
  });

  step('Disable default alert for monitor', async () => {
    await page.click('text=Disable status alert');
    await page.waitForSelector(`text=Alerts are now disabled for the monitor "Test Monitor".`);
    await page.getByTestId('Test Monitor-us_central-metric-item').hover();
    await page.click('[aria-label="Open actions menu"]');
    await page.click('text=Enable status alert');
  });

  step('set the monitor status as down', async () => {
    downCheckTime = new Date(Date.now()).toISOString();
    await services.addTestSummaryDocument({
      docType: 'summaryDown',
      timestamp: downCheckTime,
      configId,
    });
    await page.waitForTimeout(5 * 1000);

    await page.click(byTestId('syntheticsMonitorManagementTab'));
    await page.click(byTestId('syntheticsMonitorOverviewTab'));

    await page.waitForTimeout(5 * 1000);

    const totalDown = await page.textContent(byTestId('syntheticsOverviewDown'));
    expect(totalDown).toBe('1Down');
  });

  step('verified that it generates an alert', async () => {
    await page.click(byTestId('observability-nav-observability-overview-alerts'));

    const reasonMessage = getReasonMessage({
      name: 'Test Monitor',
      location: 'North America - US Central',
      status: 'down',
      checks: {
        downWithinXChecks: 1,
        down: 1,
      },
    });

    await retry.tryForTime(3 * 60 * 1000, async () => {
      await page.click(byTestId('querySubmitButton'));

      const alerts = await page.waitForSelector(`text=1 Alert`, { timeout: 5 * 1000 });
      expect(await alerts.isVisible()).toBe(true);

      const text = await page.textContent(`${byTestId('dataGridRowCell')} .euiLink`);

      expect(text).toBe(reasonMessage);
    });
  });

  step('set monitor status to up and verify that alert recovers', async () => {
    await services.addTestSummaryDocument({ configId });

    await retry.tryForTime(3 * 60 * 1000, async () => {
      await page.click(byTestId('querySubmitButton'));
      await page.isVisible(`text=Recovered`, { timeout: 5 * 1000 });
      await page.isVisible(`text=1 Alert`, { timeout: 5 * 1000 });
    });
  });

  step('set the status down again to generate another alert', async () => {
    await services.addTestSummaryDocument({ docType: 'summaryDown', configId });

    await retry.tryForTime(3 * 60 * 1000, async () => {
      await page.click(byTestId('querySubmitButton'));
      await page.isVisible(`text=Active`, { timeout: 5 * 1000 });
      await page.isVisible(`text=1 Alert`);
    });
  });

  step('Adds another down monitor and it auto adds the alert', async () => {
    const monitorId = uuidv4();
    const name = `Test Monitor 2`;
    configId2 = await services.addTestMonitor(name, {
      type: 'http',
      urls: 'https://www.google.com',
      custom_heartbeat_id: monitorId,
      locations: [
        { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
      ],
    });

    downCheckTime = new Date(Date.now()).toISOString();

    await services.addTestSummaryDocument({
      timestamp: downCheckTime,
      monitorId,
      docType: 'summaryDown',
      name,
      configId: configId2,
    });

    const reasonMessage = getReasonMessage({
      name,
      location: 'North America - US Central',
      status: 'down',
      checks: {
        downWithinXChecks: 1,
        down: 1,
      },
    });

    await retry.tryForTime(3 * 60 * 1000, async () => {
      await page.click(byTestId('querySubmitButton'));
      await page.waitForSelector(`text=2 Alerts`, { timeout: 10 * 1000 });
      const alertReasonElem = await page.waitForSelector(`text=${reasonMessage}`, {
        timeout: 10 * 1000,
      });

      expect(await alertReasonElem?.innerText()).toBe(reasonMessage);
    });
  });

  step('Deleting the monitor recovers the alert', async () => {
    await services.deleteTestMonitorByQuery('"Test Monitor 2"');
    await page.click(byTestId('alert-status-filter-recovered-button'));
    await retry.tryForTime(3 * 60 * 1000, async () => {
      await page.click(byTestId('querySubmitButton'));

      const alertsCount = await page.waitForSelector(`text=1 Alert`, { timeout: 10 * 1000 });
      expect(await alertsCount.isVisible()).toBe(true);
    });

    await page.click(byTestId('alert-status-filter-active-button'));
    await syntheticsApp.waitForLoadingToFinish();
    await page.waitForTimeout(10 * 1000);

    await page.click('[aria-label="View in app"]');
  });
});
