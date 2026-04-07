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

const SLO_DETAILS_TIMEOUT = 30000;

test.describe(
  'Explore from SLO Details - APM Navigation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
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
        await page.gotoApp(`slo/${sloId}`);
        await expect(page.testSubj.locator('sloDetailsApmSourcePanel')).toBeVisible({
          timeout: SLO_DETAILS_TIMEOUT,
        });
      });

      await test.step('source panel displays all APM fields', async () => {
        const sourcePanel = page.testSubj.locator('sloDetailsApmSourcePanel');
        await expect(sourcePanel.getByText('service.name:')).toBeVisible();
        await expect(sourcePanel.getByText('service.environment:')).toBeVisible();
        await expect(sourcePanel.getByText('transaction.type:')).toBeVisible();
        await expect(sourcePanel.getByText('transaction.name:')).toBeVisible();
      });

      await test.step('service.name links to APM service overview', async () => {
        const link = page.testSubj.locator('sloDetailsApmSourceLink-service.name');
        await expect(link).toBeVisible();
        await expect(link).toHaveText(SERVICE_NAME);
        const href = await link.getAttribute('href');
        expect(href).toContain(`/app/apm/services/${SERVICE_NAME}/overview`);
      });

      await test.step('service.environment links to APM with environment filter', async () => {
        const link = page.testSubj.locator('sloDetailsApmSourceLink-service.environment');
        await expect(link).toBeVisible();
        await expect(link).toHaveText(ENVIRONMENT);
        const href = await link.getAttribute('href');
        expect(href).toContain(`/app/apm/services/${SERVICE_NAME}/overview`);
        expect(href).toContain(`environment=${ENVIRONMENT}`);
      });

      await test.step('transaction.type links to APM with transaction type filter', async () => {
        const link = page.testSubj.locator('sloDetailsApmSourceLink-transaction.type');
        await expect(link).toBeVisible();
        await expect(link).toHaveText(TRANSACTION_TYPE);
        const href = await link.getAttribute('href');
        expect(href).toContain(`/app/apm/services/${SERVICE_NAME}/overview`);
        expect(href).toContain(`transactionType=${TRANSACTION_TYPE}`);
      });

      await test.step('transaction.name links to APM transactions tab', async () => {
        const link = page.testSubj.locator('sloDetailsApmSourceLink-transaction.name');
        await expect(link).toBeVisible();
        await expect(link).toHaveText(TRANSACTION_NAME);
        const href = await link.getAttribute('href');
        expect(href).toContain(`/app/apm/services/${SERVICE_NAME}/overview`);
        expect(href).toContain('serviceOverviewTab=transactions');
      });

      await test.step('SLI chart panel shows Open dropdown for APM SLOs', async () => {
        await expect(page.testSubj.locator('sliChartPanel')).toBeVisible();
        const actionsButton = page.testSubj.locator('sliChartActionsButton');
        await expect(actionsButton).toBeVisible();
        await expect(actionsButton).toHaveText('Open');

        await actionsButton.click();
        await expect(page.testSubj.locator('slidHistoryChartViewInApmLink')).toBeVisible();
        await expect(page.testSubj.locator('slidHistoryChartOpenInDiscoverLink')).toBeVisible();
      });
    });
  }
);
