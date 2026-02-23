/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewRule } from '../../../common/rule_objects';
import { SECURITY_ARCHIVES } from '../../../common/es_helpers';
import { ALERTS_URL } from '../../../common/urls';

test.describe(
  'Alerts table bulk actions',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(kbnClient, getNewRule({ rule_id: 'bulk-actions-rule' }));
    });

    test.afterAll(async ({ esArchiver }) => {
      // no-op: Scout EsArchiverFixture does not support unload;
    });

    test('shows bulk actions and case actions', async ({ pageObjects, page }) => {
      const { detectionAlerts } = pageObjects;

      await page.goto(ALERTS_URL);
      await detectionAlerts.waitForAlertsToLoad();

      await test.step('Select multiple alerts', async () => {
        const alertCheckboxes = detectionAlerts.alertCheckbox;
        const count = await alertCheckboxes.count();
        test.skip(count < 2, 'Insufficient alert data');
        await detectionAlerts.selectNumberOfAlerts(2);
      });

      await test.step('Verify bulk actions are available', async () => {
        await expect(detectionAlerts.selectedAlertsButton.first()).toContainText(
          'Selected 2 alerts'
        );
        await detectionAlerts.clickTakeActionPopover();
        await expect(detectionAlerts.addToNewCaseButton.first()).toBeVisible();
        await expect(detectionAlerts.addToExistingCaseButton.first()).toBeVisible();
      });
    });
  }
);
