/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../../common/api_helpers';
import { getNewRule } from '../../../../common/rule_objects';
import { ALERTS_URL } from '../../../../common/urls';

test.describe(
  'Opening alert previews from alert details flyout',
  { tag: tags.deploymentAgnostic },
  () => {
    const rule = getNewRule();

    test.beforeEach(async ({ browserAuth, page, apiServices }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices, rule);
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
      await page.testSubj.locator('expand-event').click();
      await page.testSubj.locator('securitySolutionFlyoutNavigationExpandDetailButton').click();
      await page.testSubj.locator('securitySolutionFlyoutInsightsTab').click();
      await page.testSubj.locator('securitySolutionFlyoutInsightsTabCorrelationsButton').click();
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should render alert preview from related by source', async ({ page }) => {
      await expect(
        page.testSubj.locator('securitySolutionFlyoutCorrelationsRelatedBySourceSectionTable')
      ).toBeVisible();

      const expandButton = page.testSubj
        .locator('securitySolutionFlyoutCorrelationsRelatedBySourceSectionTable')
        .getByRole('button', { name: 'Expand' });
      await expandButton.click();

      await test.step('Verify preview section is visible', async () => {
        await expect(page.testSubj.locator('previewSection')).toBeVisible();
        await expect(page.testSubj.locator('previewSectionBannerText')).toHaveText(
          'Preview alert details'
        );
        await expect(page.testSubj.locator('previewSectionBackButton')).toBeVisible();
        await expect(page.testSubj.locator('previewSectionCloseButton')).toBeVisible();
      });

      await test.step('Verify preview footer is visible', async () => {
        await expect(page.testSubj.locator('securitySolutionFlyoutPreviewFooter')).toBeVisible();
        await expect(
          page.testSubj.locator('securitySolutionFlyoutPreviewFooterLink')
        ).toBeVisible();
      });
    });

    test('should close previews when close button is clicked', async ({ page }) => {
      await expect(
        page.testSubj.locator('securitySolutionFlyoutCorrelationsRelatedBySessionSectionTable')
      ).toBeVisible();

      const expandButton = page.testSubj
        .locator('securitySolutionFlyoutCorrelationsRelatedBySessionSectionTable')
        .getByRole('button', { name: 'Expand' });
      await expandButton.click();

      await expect(page.testSubj.locator('previewSection')).toBeVisible();
      await expect(page.testSubj.locator('securitySolutionFlyoutPreviewFooter')).toBeVisible();

      await page.testSubj.locator('previewSectionCloseButton').click();

      await expect(page.testSubj.locator('previewSection')).toBeHidden();
    });

    test('should go to previous previews when back button is clicked', async ({ page }) => {
      await expect(
        page.testSubj.locator('securitySolutionFlyoutCorrelationsRelatedBySessionSectionTable')
      ).toBeVisible();

      const expandButton = page.testSubj
        .locator('securitySolutionFlyoutCorrelationsRelatedBySessionSectionTable')
        .getByRole('button', { name: 'Expand' });
      await expandButton.click();

      await expect(page.testSubj.locator('previewSection')).toBeVisible();
      await expect(page.testSubj.locator('securitySolutionFlyoutPreviewFooter')).toBeVisible();

      await page.testSubj.locator('previewSectionBackButton').click();

      await expect(page.testSubj.locator('previewSection')).toBeHidden();
    });

    test('should open a new flyout when footer link is clicked', async ({ page }) => {
      await expect(
        page.testSubj.locator('securitySolutionFlyoutCorrelationsRelatedByAncestrySectionTable')
      ).toBeVisible();

      const expandButton = page.testSubj
        .locator('securitySolutionFlyoutCorrelationsRelatedByAncestrySectionTable')
        .getByRole('button', { name: 'Expand' });
      await expandButton.click();

      await expect(page.testSubj.locator('previewSection')).toBeVisible();
      await expect(page.testSubj.locator('securitySolutionFlyoutPreviewFooter')).toBeVisible();

      await page.testSubj.locator('securitySolutionFlyoutPreviewFooterLink').click();

      await expect(page.testSubj.locator('previewSection')).toBeHidden();
      await expect(page.testSubj.locator('securitySolutionFlyoutFooter')).toBeVisible();
      await expect(
        page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton')
      ).toBeVisible();
    });
  }
);
