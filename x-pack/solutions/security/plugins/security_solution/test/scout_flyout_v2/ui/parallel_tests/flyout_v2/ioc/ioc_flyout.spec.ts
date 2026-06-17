/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI tests for the flyout_v2 IOC (Indicator of Compromise) flyout.
 *
 * Entry path: Security → Threat Intelligence → Indicators table →
 *   click `tiToggleIndicatorFlyoutButton` → IOC flyout opens.
 *
 * The indicators table queries the global `logs-ti_*` pattern (not space-scoped), so each test
 * indexes a uniquely-named indicator and filters the table down to it via the KQL search bar
 * before opening the flyout, keeping assertions deterministic across parallel workers.
 *
 * Tagged `stateful.classic` only, since the Threat Intelligence page is not available in all
 * serverless security configurations.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe('IOC flyout v2', { tag: [...tags.stateful.classic] }, () => {
  let indicatorName: string;

  spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
    ({ indicatorName } = await apiServices.threatIntelligence.createFileIndicatorFixture(
      scoutSpace.id
    ));
    await browserAuth.loginAsPlatformEngineer();
  });

  spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
    await apiServices.threatIntelligence.cleanupFileIndicatorFixture(scoutSpace.id);
  });

  spaceTest(
    'navigates between the Overview, Table and JSON tabs and the "View all fields in table" shortcut',
    async ({ pageObjects }) => {
      await pageObjects.threatIntelligenceIndicatorsPage.navigate();
      await pageObjects.threatIntelligenceIndicatorsPage.openFlyoutForIndicator(indicatorName);
      await pageObjects.iocFlyout.waitForFlyout();

      await spaceTest.step('Overview tab shows the highlighted fields table', async () => {
        await expect(pageObjects.iocFlyout.overviewTable).toBeVisible();
      });

      await spaceTest.step('Table tab shows the all-fields table', async () => {
        await pageObjects.iocFlyout.selectTableTab();
        await expect(pageObjects.iocFlyout.fieldsTable).toBeVisible();
      });

      await spaceTest.step('JSON tab renders the indicator document as valid JSON', async () => {
        await pageObjects.iocFlyout.selectJsonTab();
        await expect(pageObjects.iocFlyout.jsonViewer).toBeVisible();

        // Read the editor model directly and confirm it is valid JSON for this indicator.
        const rawJson = await pageObjects.iocFlyout.getJsonTabValue();
        const parsed = JSON.parse(rawJson);
        expect(parsed.fields['threat.indicator.name']).toContain(indicatorName);
      });

      await spaceTest.step('returning to the Overview tab restores its content', async () => {
        await pageObjects.iocFlyout.selectOverviewTab();
        await expect(pageObjects.iocFlyout.overviewTable).toBeVisible();
      });

      await spaceTest.step(
        'the Overview tab "View all fields in table" button navigates to the Table tab',
        async () => {
          await pageObjects.iocFlyout.clickViewAllFieldsInTable();
          await expect(pageObjects.iocFlyout.fieldsTable).toBeVisible();
        }
      );
    }
  );

  spaceTest(
    'the take action menu lists every action and Investigate in Timeline opens the timeline',
    async ({ pageObjects }) => {
      await pageObjects.threatIntelligenceIndicatorsPage.navigate();
      await pageObjects.threatIntelligenceIndicatorsPage.openFlyoutForIndicator(indicatorName);
      await pageObjects.iocFlyout.waitForFlyout();

      await spaceTest.step('the take action menu lists the expected items', async () => {
        await pageObjects.iocFlyout.openTakeActionMenu();
        await expect(pageObjects.iocFlyout.investigateInTimelineItem).toBeVisible();
        await expect(pageObjects.iocFlyout.addToExistingCaseItem).toBeVisible();
        await expect(pageObjects.iocFlyout.addToNewCaseItem).toBeVisible();
        await expect(pageObjects.iocFlyout.addToBlockListItem).toBeVisible();
      });

      await spaceTest.step('Investigate in Timeline opens the timeline', async () => {
        await pageObjects.iocFlyout.investigateInTimelineItem.click();
        await expect(pageObjects.timelinePage.panel).toBeVisible({ timeout: 15_000 });
      });
    }
  );

  spaceTest(
    'take action → Add to block list opens the block list creation flyout',
    async ({ pageObjects, page }) => {
      await pageObjects.threatIntelligenceIndicatorsPage.navigate();
      await pageObjects.threatIntelligenceIndicatorsPage.openFlyoutForIndicator(indicatorName);
      await pageObjects.iocFlyout.waitForFlyout();

      await pageObjects.iocFlyout.openTakeActionMenu();
      await pageObjects.iocFlyout.addToBlockListItem.click();

      await expect(page.testSubj.locator('blocklist-form-name-input')).toBeVisible({
        timeout: 15_000,
      });
    }
  );

  spaceTest(
    'take action → Add to case opens the existing-case modal and the new-case flyout',
    async ({ pageObjects, page }) => {
      await pageObjects.threatIntelligenceIndicatorsPage.navigate();
      await pageObjects.threatIntelligenceIndicatorsPage.openFlyoutForIndicator(indicatorName);
      await pageObjects.iocFlyout.waitForFlyout();

      await spaceTest.step('Add to existing case opens the select-case modal', async () => {
        await pageObjects.iocFlyout.openTakeActionMenu();
        await pageObjects.iocFlyout.addToExistingCaseItem.click();
        const modal = page.testSubj.locator('all-cases-modal');
        await expect(modal).toBeVisible({ timeout: 15_000 });
        // Dismiss the modal (no fields touched, so it closes cleanly) before the next action.
        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden();
      });

      await spaceTest.step('Add to new case opens the create-case flyout', async () => {
        await pageObjects.iocFlyout.openTakeActionMenu();
        await pageObjects.iocFlyout.addToNewCaseItem.click();
        await expect(page.testSubj.locator('create-case-submit')).toBeVisible({ timeout: 15_000 });
      });
    }
  );
});
