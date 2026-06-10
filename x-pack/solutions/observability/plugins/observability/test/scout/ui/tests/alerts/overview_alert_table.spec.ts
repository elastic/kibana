/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { generateObservabilityAlerts } from '../../fixtures/alerts_data';

// Ported from the FTR `Observability overview` suite
// (x-pack/solutions/observability/test/observability_functional/apps/observability/pages/overview/alert_table.ts).
//
// The overview "no data" prompt and the alerts section are both driven by
// whether any Observability rule exists (the `alert` data section calls
// `/api/alerting/rules/_find` and treats a rule with an allowed consumer as
// "has data"), not by the selected time range. So the "Without data" case
// clears all rules and the "With data" case creates one rule before navigating.
const ALERTS_FIRST_PAGE = 10;

test.describe(
  'Observability alerts - overview alert table',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ esClient }) => {
      await generateObservabilityAlerts(esClient);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.alerting.cleanup.deleteAllRules();
    });

    test('navigates to onboarding from the no-data "Add data" CTA', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      // No Observability rules => the overview reports no data and shows the CTA.
      // The overview's `hasData.alert` flag is driven by `/api/alerting/rules/_find`,
      // so wait until no rules remain before navigating: `deleteAllRules` issues
      // async deletes and a stale rule would keep the page in its "has data"
      // layout, in which case the no-data prompt never renders.
      await apiServices.alerting.cleanup.deleteAllRules();
      await expect
        .poll(async () => (await apiServices.alerting.rules.find({ per_page: 1 })).data.total, {
          timeout: 30_000,
          intervals: [1_000],
        })
        .toBe(0);

      await pageObjects.overviewPage.gotoWithoutAlerts();
      await expect(pageObjects.overviewPage.noDataPrompt).toBeVisible();

      await pageObjects.overviewPage.clickAddData();
      await expect.poll(() => page.url()).toContain('observabilityOnboarding');
    });

    test('renders the alerts section with alerts once a rule exists', async ({
      apiServices,
      pageObjects,
    }) => {
      // Any rule with an allowed consumer flips the overview to the "with data"
      // layout that renders the alerts section.
      await apiServices.alerting.rules.create({
        name: 'Overview alerts section test',
        consumer: 'logs',
        ruleTypeId: '.es-query',
        params: {
          size: 100,
          thresholdComparator: '>',
          threshold: [-1],
          index: ['alert-test-data'],
          timeField: 'date',
          esQuery: JSON.stringify({ query: { match_all: {} } }),
          timeWindowSize: 20,
          timeWindowUnit: 's',
        },
        schedule: { interval: '1m' },
      });

      await pageObjects.overviewPage.gotoWithAlerts();
      await pageObjects.overviewPage.waitForAlertsSection();

      await expect.poll(() => pageObjects.overviewPage.getAlertsRowCount()).toBe(ALERTS_FIRST_PAGE);
    });
  }
);
