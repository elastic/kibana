/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Threat intelligence tool overlay',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.threatIntelligence.cleanupFileHashEnrichmentFixture(scoutSpace.id);
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest(
      'tools flyout header shows rule name with alert icon and opens child document flyout on click',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.insightsSection).toBeVisible();
        await pageObjects.threatIntelligenceTool.titleLink.click();

        await expect(pageObjects.threatIntelligenceTool.detailsLoading).toHaveCount(0, {
          timeout: 15_000,
        });

        // Header shows the rule name and the alert (warning) icon
        await expect(pageObjects.threatIntelligenceTool.toolsFlyoutTitle).toContainText(ruleName);
        await expect(pageObjects.threatIntelligenceTool.toolsFlyoutTitleAlertIcon).toBeVisible();

        // Clicking the header opens a child document flyout for the same alert
        await pageObjects.threatIntelligenceTool.toolsFlyoutTitle.click();
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();
        await expect(pageObjects.documentFlyoutV2.title).toContainText(ruleName);
      }
    );

    spaceTest(
      'shows no-enrichment message when alert has no threat intelligence',
      async ({ pageObjects }) => {
        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(ruleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.insightsSection).toBeVisible();
        await pageObjects.threatIntelligenceTool.titleLink.click();

        await expect(pageObjects.threatIntelligenceTool.detailsLoading).toHaveCount(0, {
          timeout: 15_000,
        });

        await expect(pageObjects.threatIntelligenceTool.detailsNoEnrichmentFound).toBeVisible();
      }
    );

    spaceTest(
      'shows fields enriched with threat intelligence count in insights section',
      async ({ pageObjects, scoutSpace, apiServices }) => {
        // Single-doc index with file.hash.sha256; the TI rule targets it exclusively so the
        // flyout enriches the one resulting alert via investigation-time query against logs-ti_*.
        const { sourceIndex } =
          await apiServices.threatIntelligence.createFileHashEnrichmentFixture(scoutSpace.id);

        const tiRuleName = `TI Enrichment Test_${scoutSpace.id}_${Date.now()}`;
        await apiServices.detectionRule.createCustomQueryRule({
          ...CUSTOM_QUERY_RULE,
          rule_id: `ti-enrichment-rule-${scoutSpace.id}`,
          name: tiRuleName,
          index: [sourceIndex],
        });

        await pageObjects.alertsTablePage.navigate();
        await pageObjects.alertsTablePage.waitForRuleAlert(tiRuleName);
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(tiRuleName);
        await pageObjects.documentFlyoutV2.waitForAlertFlyout();

        await expect(pageObjects.documentFlyoutV2.insightsSection).toBeVisible();

        // "Fields enriched with threat intelligence" should show 1
        await expect(pageObjects.threatIntelligenceTool.enrichedButton).toBeVisible();
        await expect(pageObjects.threatIntelligenceTool.enrichedButton).toHaveText('1');

        // Drill into the threat intelligence tool overlay
        await pageObjects.threatIntelligenceTool.enrichedButton.click();

        // Wait for the tool view to fully render (event-data load + investigation-time query)
        await expect(pageObjects.threatIntelligenceTool.detailsLoading).toHaveCount(0, {
          timeout: 15_000,
        });
        await expect(pageObjects.threatIntelligenceTool.detailsLoadingEnrichment).toHaveCount(0, {
          timeout: 15_000,
        });

        // "Enriched with threat intelligence" section (investigation-time) must be present
        await expect(pageObjects.threatIntelligenceTool.detailsEnrichedSection).toBeVisible();

        // Date range picker is always rendered for investigation-time enrichments
        await expect(pageObjects.threatIntelligenceTool.detailsRangePicker).toBeVisible();

        // Exactly one accordion — one indicator matched the source doc's file.hash.sha256
        await expect(pageObjects.threatIntelligenceTool.detailsAccordions).toHaveCount(1);

        // Accordion detail table renders field/value rows for the indicator
        await expect(pageObjects.threatIntelligenceTool.detailsAccordionTable(0)).toBeVisible();

        // Feed name from the fixture indicator is displayed in the accordion
        await expect(pageObjects.threatIntelligenceTool.detailsAccordionTable(0)).toContainText(
          'Scout Test Feed'
        );
      }
    );
  }
);
