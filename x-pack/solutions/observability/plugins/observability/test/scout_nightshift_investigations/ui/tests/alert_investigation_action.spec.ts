/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import {
  FIRST_ACTIVE_ALERT_ID,
  generateObservabilityAlerts,
  OBSERVABILITY_ALERT_RULE,
} from '../../../scout/ui/fixtures/alerts_data';
import { test } from '../../../scout/ui/fixtures';
import { ALERT_STATUS_CONTROL_ID } from '../../../scout/ui/fixtures/constants';
import { mockStartInvestigation } from '../fixtures/mocks';

test.describe(
  'Observability alert investigation action',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient }) => {
      await generateObservabilityAlerts(esClient);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.alertsTablePage.goto();
      await pageObjects.alertControls.clearControlSelections(ALERT_STATUS_CONTROL_ID);
      await pageObjects.alertsTablePage.waitForTableToLoad();
    });

    test('starts an investigation from an alert row action', async ({ page, pageObjects }) => {
      const requestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/internal/nightshift/investigations')
      );
      await mockStartInvestigation(page);

      await pageObjects.alertsTablePage.openActionsMenuForRow(0);
      await pageObjects.alertsTablePage.clickInvestigate();

      const request = await requestPromise;
      expect(request.postDataJSON()).toMatchObject({
        subject: { type: 'alert', id: FIRST_ACTIVE_ALERT_ID },
        concurrency_key: FIRST_ACTIVE_ALERT_ID,
        context: {
          alerts: [
            {
              id: FIRST_ACTIVE_ALERT_ID,
              rule_id: OBSERVABILITY_ALERT_RULE.uuid,
              rule_name: OBSERVABILITY_ALERT_RULE.name,
              rule_type_id: OBSERVABILITY_ALERT_RULE.ruleTypeId,
              rule_category: OBSERVABILITY_ALERT_RULE.category,
            },
          ],
        },
      });
    });
  }
);
