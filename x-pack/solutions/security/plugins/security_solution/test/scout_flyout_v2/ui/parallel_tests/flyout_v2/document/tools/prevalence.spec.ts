/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  spaceTest,
  tags,
  CUSTOM_QUERY_RULE,
  TIMELINE_MODAL_HEADER_PANEL_TEST_SUBJ,
  TIMELINE_PROVIDER_BADGE_TEST_SUBJ,
  PREVALENCE_SOURCE_IP,
} from '@kbn/scout-security';
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

    spaceTest(
      'tools flyout header shows rule name with alert icon and opens child document flyout on click',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyout.waitForAlertFlyout();

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

    spaceTest(
      'hovering a value shows filter-in option which adds a filter badge to the page',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyout.waitForAlertFlyout();

        await expect(pageObjects.documentFlyout.insightsSection).toBeVisible();
        await pageObjects.prevalenceTool.titleLink.click();

        await expect(pageObjects.prevalenceTool.toolsFlyoutHeader).toBeVisible({
          timeout: 10_000,
        });
        await expect(pageObjects.prevalenceTool.table).toBeVisible();

        // Hover over a value cell — all three cell action buttons must be visible
        await pageObjects.prevalenceTool.valueCellHoverTarget.hover();
        await expect(pageObjects.prevalenceTool.hoverActionsPopover).toBeVisible();
        await expect(pageObjects.prevalenceTool.filterInAction).toBeVisible();
        await expect(pageObjects.prevalenceTool.filterOutAction).toBeVisible();
        await expect(pageObjects.prevalenceTool.addToTimelineAction).toBeVisible();

        // Filter-in adds the first filter badge
        await pageObjects.prevalenceTool.filterInAction.click();
        await expect(pageObjects.prevalenceTool.filterBadges).toHaveCount(1);

        // Filter-out replaces the existing positive filter with a negated one — badge count stays 1
        await pageObjects.prevalenceTool.valueCellHoverTarget.hover();
        await expect(pageObjects.prevalenceTool.filterOutAction).toBeVisible();
        await pageObjects.prevalenceTool.filterOutAction.click();
        await expect(pageObjects.prevalenceTool.filterBadges).toHaveCount(1);
      }
    );

    spaceTest(
      'clicking the alert count opens the timeline with a data provider for that field',
      async ({ pageObjects, page }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyout.waitForAlertFlyout();

        await expect(pageObjects.documentFlyout.insightsSection).toBeVisible();
        await pageObjects.prevalenceTool.titleLink.click();

        await expect(pageObjects.prevalenceTool.toolsFlyoutHeader).toBeVisible({
          timeout: 10_000,
        });
        await expect(pageObjects.prevalenceTool.table).toBeVisible();

        await pageObjects.prevalenceTool.firstAlertCountTimelineButton.click();

        // Timeline modal opens
        await expect(page.getByTestId(TIMELINE_MODAL_HEADER_PANEL_TEST_SUBJ)).toBeVisible({
          timeout: 15_000,
        });

        // Data provider is set with the field-value pair from the row
        await expect(page.getByTestId(TIMELINE_PROVIDER_BADGE_TEST_SUBJ)).toBeVisible();
      }
    );

    spaceTest(
      'source.ip value in prevalence table is clickable and opens the network details flyout',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyout.waitForAlertFlyout();

        await expect(pageObjects.documentFlyout.insightsSection).toBeVisible();
        await pageObjects.prevalenceTool.titleLink.click();

        await expect(pageObjects.prevalenceTool.toolsFlyoutHeader).toBeVisible({
          timeout: 10_000,
        });

        await expect(pageObjects.prevalenceTool.sourceIpChildLink).toBeVisible();
        await pageObjects.prevalenceTool.sourceIpChildLink.click();

        // Network details flyout opens
        await expect(pageObjects.prevalenceTool.networkDetailsFlyoutHeaderText).toBeVisible({
          timeout: 10_000,
        });
        await expect(pageObjects.prevalenceTool.networkDetailsFlyoutHeaderText).toContainText(
          PREVALENCE_SOURCE_IP
        );
      }
    );
  }
);
