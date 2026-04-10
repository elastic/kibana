/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const SERVICE_NAME = 'synth-slo-e2e-service';
const ENVIRONMENT = 'production';
const TRANSACTION_TYPE = 'request';
const TRANSACTION_NAME = 'GET /api/checkout';

const APM_SLO_PAYLOAD = {
  name: 'E2E APM SLO - Source Panel Navigation',
  description: 'APM SLO for testing source panel navigation to APM',
  indicator: {
    type: 'sli.apm.transactionDuration',
    params: {
      service: SERVICE_NAME,
      environment: ENVIRONMENT,
      transactionType: TRANSACTION_TYPE,
      transactionName: TRANSACTION_NAME,
      threshold: 500,
      index: 'metrics-apm*',
    },
  },
  budgetingMethod: 'occurrences',
  timeWindow: {
    duration: '30d',
    type: 'rolling',
  },
  objective: {
    target: 0.99,
  },
  tags: ['e2e-test'],
};

const TEST_TIMEOUT = 3 * 60 * 1000;

test.describe(
  'Explore from SLO Details - APM Navigation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // eslint-disable-next-line @kbn/eslint/scout_no_describe_configure
    test.describe.configure({ timeout: TEST_TIMEOUT });

    let sloId: string | undefined;

    test.beforeAll(async ({ kbnClient }) => {
      const { data } = await kbnClient.request({
        method: 'POST',
        path: '/api/observability/slos',
        body: APM_SLO_PAYLOAD,
      });
      sloId = (data as { id: string }).id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      if (sloId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/observability/slos/${sloId}`,
        });
      }
    });

    test('Source panel renders with APM links for APM-based SLO', async ({ page }) => {
      await test.step('navigate to SLO details', async () => {
        await expect(async () => {
          await page.gotoApp(`slo/${sloId}`);
          await expect(page.testSubj.locator('sloDetailsApmSourcePanel')).toBeVisible({
            timeout: 10000,
          });
        }).toPass({ intervals: [5000], timeout: TEST_TIMEOUT });
      });

      await test.step('source panel displays all APM fields', async () => {
        const sourcePanel = page.testSubj.locator('sloDetailsApmSourcePanel');
        await expect(sourcePanel.getByText('service.name:')).toBeVisible();
        await expect(sourcePanel.getByText('service.environment:')).toBeVisible();
        await expect(sourcePanel.getByText('transaction.type:')).toBeVisible();
        await expect(sourcePanel.getByText('transaction.name:')).toBeVisible();
      });

      await test.step('service.name navigates to APM service overview', async () => {
        await page.testSubj.locator('sloDetailsApmSourceLink-service.name').click();
        await page.waitForURL(`**/app/apm/services/${SERVICE_NAME}/overview**`);

        const url = page.url();
        expect(url).toContain(`/app/apm/services/${SERVICE_NAME}/overview`);
        expect(url).toContain('environment=ENVIRONMENT_ALL');

        await page.goBack();
        await expect(page.testSubj.locator('sloDetailsApmSourcePanel')).toBeVisible();
      });

      await test.step('service.environment navigates to APM with environment filter', async () => {
        await page.testSubj.locator('sloDetailsApmSourceLink-service.environment').click();
        await page.waitForURL(`**/app/apm/services/${SERVICE_NAME}/overview**`);

        const url = page.url();
        expect(url).toContain(`environment=${ENVIRONMENT}`);

        await page.goBack();
        await expect(page.testSubj.locator('sloDetailsApmSourcePanel')).toBeVisible();
      });

      await test.step('transaction.type navigates to APM with transactionType filter', async () => {
        await page.testSubj.locator('sloDetailsApmSourceLink-transaction.type').click();
        await page.waitForURL(`**/app/apm/services/${SERVICE_NAME}/overview**`);

        const url = page.url();
        expect(url).toContain(`transactionType=${TRANSACTION_TYPE}`);

        await page.goBack();
        await expect(page.testSubj.locator('sloDetailsApmSourcePanel')).toBeVisible();
      });

      await test.step('transaction.name navigates to APM transactions tab', async () => {
        await page.testSubj.locator('sloDetailsApmSourceLink-transaction.name').click();
        await page.waitForURL(`**/app/apm/services/${SERVICE_NAME}/**`);

        const url = page.url();
        expect(url).toContain(`transactionName=${encodeURIComponent(TRANSACTION_NAME)}`);

        await page.goBack();
        await expect(page.testSubj.locator('sloDetailsApmSourcePanel')).toBeVisible();
      });

      await test.step('SLI chart panel shows Open dropdown for APM SLOs', async () => {
        await expect(page.testSubj.locator('sliChartPanel')).toBeVisible();
        const actionsButton = page.testSubj.locator('sliChartActionsButton');
        await expect(actionsButton).toBeVisible();
        await expect(actionsButton).toHaveText('Open');

        await actionsButton.click();
        await expect(page.testSubj.locator('sliHistoryChartViewInApmLink')).toBeVisible();
        await expect(page.testSubj.locator('sliHistoryChartOpenInDiscoverLink')).toBeVisible();
      });
    });
  }
);
