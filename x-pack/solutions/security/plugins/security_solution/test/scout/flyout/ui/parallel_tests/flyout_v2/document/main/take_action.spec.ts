/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI tests for the "Take action" menu inside the flyout_v2 document flyout.
 */

import {
  spaceTest,
  tags,
  CUSTOM_QUERY_RULE,
  INVESTIGATE_IN_TIMELINE_MENU_ITEM_TEST_SUBJ,
} from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Take action menu',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: ['auditbeat-*'],
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest('investigate in timeline — opens Timeline with document', async ({ pageObjects }) => {
      await pageObjects.documentFlyout.openForRule(ruleName);

      await pageObjects.documentFlyout.openTakeActionMenu();
      await pageObjects.documentFlyout.clickTakeActionItem(
        INVESTIGATE_IN_TIMELINE_MENU_ITEM_TEST_SUBJ
      );

      await expect(pageObjects.timelinePage.panel).toBeVisible({ timeout: 15_000 });
    });
  }
);
