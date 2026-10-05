/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Prevalence tool overlay',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      const { sourceIndex } = await apiServices.prevalence.createPrevalenceFixture(scoutSpace.id);

      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: [sourceIndex],
        investigation_fields: { field_names: ['source.ip'] },
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      await apiServices.prevalence.cleanupPrevalenceFixture(scoutSpace.id);
    });

    // This is the single integration smoke for the shared `ToolsFlyoutTitle` header (title + alert
    // icon → child document flyout). The same behaviour previously repeated across every tool spec;
    // it's now exercised once here and unit-covered in tools_flyout_title.test.tsx.
    spaceTest(
      'tools flyout header shows rule name with alert icon and opens child document flyout on click',
      async ({ pageObjects }) => {
        await pageObjects.documentFlyout.openForRule(ruleName);

        await expect(pageObjects.documentFlyout.insightsSection).toBeVisible();
        await pageObjects.prevalenceTool.titleLink.click();

        // Header shows the rule name and the alert (warning) icon
        await expect(pageObjects.prevalenceTool.toolsFlyoutTitle).toContainText(ruleName);
        await expect(pageObjects.prevalenceTool.toolsFlyoutTitleAlertIcon).toBeVisible();

        await pageObjects.prevalenceTool.toolsFlyoutTitle.click();
        await pageObjects.documentFlyout.waitForChildDocumentFlyout();
        await expect(pageObjects.documentFlyout.childDocumentAlertTitle).toContainText(ruleName);
      }
    );
  }
);
