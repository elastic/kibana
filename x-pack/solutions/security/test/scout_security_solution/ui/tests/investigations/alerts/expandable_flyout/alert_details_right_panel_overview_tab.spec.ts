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
  'Alert details expandable flyout right panel overview tab',
  { tag: tags.deploymentAgnostic },
  () => {
    const rule = getNewRule({ investigation_fields: { field_names: ['host.os.name'] } });

    test.beforeEach(async ({ browserAuth, page, apiServices }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices, rule);
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
      await page.testSubj.locator('expand-event').click();
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should display about section', async ({ page }) => {
      await test.step('Verify header and content', async () => {
        await expect(page.testSubj.locator('securitySolutionFlyoutAboutSectionHeader')).toHaveText(
          'About'
        );
      });

      await test.step('Verify description', async () => {
        await expect(page.testSubj.locator('securitySolutionFlyoutDescriptionTitle')).toContainText(
          'Rule description'
        );

        const ruleDescriptionTitle = page.testSubj.locator(
          'securitySolutionFlyoutDescriptionTitle'
        );
        await expect(
          ruleDescriptionTitle.locator('[data-test-subj="securitySolutionFlyoutRuleSummaryButton"]')
        ).toHaveText('Show rule summary');

        await expect(page.testSubj.locator('securitySolutionFlyoutDescriptionDetails')).toHaveText(
          rule.description
        );
      });

      await test.step('Verify reason', async () => {
        const reasonTitle = page.testSubj.locator('securitySolutionFlyoutReasonTitle');
        await expect(reasonTitle).toContainText('Alert reason');
        await expect(reasonTitle).toContainText('Show full reason');

        await expect(page.testSubj.locator('securitySolutionFlyoutReasonDetails')).toContainText(
          rule.name
        );
      });
    });

    test('should display visualizations section', async ({ page }) => {
      await test.step('Toggle sections to reveal visualizations', async () => {
        await page.testSubj.locator('securitySolutionFlyoutAboutSectionHeader').click();
        await page.testSubj.locator('securitySolutionFlyoutInvestigationSectionHeader').click();
        await page.testSubj.locator('securitySolutionFlyoutVisualizationsHeader').click();
      });

      await test.step('Verify session view preview', async () => {
        await expect(
          page.testSubj.locator('securitySolutionFlyoutSessionPreviewContent')
        ).toBeVisible();
        await expect(
          page.testSubj.locator('securitySolutionFlyoutSessionViewNoData')
        ).toBeVisible();
      });

      await test.step('Verify analyzer graph preview', async () => {
        await expect(
          page.testSubj.locator('securitySolutionFlyoutAnalyzerPreviewContent')
        ).toContainText('zsh');
      });
    });

    test('should display investigation section', async ({ page }) => {
      await page.testSubj.locator('securitySolutionFlyoutAboutSectionHeader').click();

      await test.step('Verify header and content', async () => {
        await expect(
          page.testSubj.locator('securitySolutionFlyoutInvestigationSectionHeader')
        ).toHaveText('Investigation');
      });

      await test.step('Verify investigation guide button', async () => {
        await expect(
          page.testSubj.locator('securitySolutionFlyoutInvestigationGuideButton')
        ).toHaveText('Show investigation guide');
      });

      await test.step('Navigate to left Investigation tab', async () => {
        await page.testSubj.locator('securitySolutionFlyoutInvestigationGuideButton').click();

        const investigationTab = page.testSubj.locator('securitySolutionFlyoutInvestigationTab');
        await expect(investigationTab).toHaveText('Investigation');
        await expect(investigationTab).toHaveClass(/euiTab-isSelected/);
      });

      await test.step('Verify highlighted fields', async () => {
        await expect(
          page.testSubj.locator('securitySolutionFlyoutHighlightedFieldsTitle')
        ).toHaveText('Highlighted fields');
        await expect(
          page.testSubj.locator('securitySolutionFlyoutHighlightedFieldsDetails')
        ).toBeVisible();

        await expect(page.testSubj.locator('fieldCell')).toContainText('host.os.name');
        await expect(page.testSubj.locator('fieldCell')).toContainText('host.name');
        await expect(page.testSubj.locator('fieldCell')).toContainText('user.name');
      });
    });

    test('should display entities section in insights', async ({ page }) => {
      await page.testSubj.locator('securitySolutionFlyoutAboutSectionHeader').click();
      await page.testSubj.locator('securitySolutionFlyoutInvestigationSectionHeader').click();
      await page.testSubj.locator('securitySolutionFlyoutInsightsHeader').click();

      await expect(
        page.testSubj.locator('securitySolutionFlyoutInsightsEntitiesTitleLink')
      ).toHaveText('Entities');

      await test.step('Navigate to left panel Entities tab', async () => {
        await page.testSubj.locator('securitySolutionFlyoutInsightsEntitiesTitleLink').click();
        const insightsTab = page.testSubj.locator('securitySolutionFlyoutInsightsTab');
        await expect(insightsTab).toHaveText('Insights');
        await expect(insightsTab).toHaveClass(/euiTab-isSelected/);

        const entitiesButton = page.testSubj.locator(
          'securitySolutionFlyoutInsightsTabEntitiesButton'
        );
        await expect(entitiesButton).toHaveText('Entities');
        await expect(entitiesButton).toHaveClass(/euiButtonGroupButton-isSelected/);
      });
    });

    test('should display threat intelligence section in insights', async ({ page }) => {
      await page.testSubj.locator('securitySolutionFlyoutAboutSectionHeader').click();
      await page.testSubj.locator('securitySolutionFlyoutInvestigationSectionHeader').click();
      await page.testSubj.locator('securitySolutionFlyoutInsightsHeader').click();

      await expect(
        page.testSubj.locator('securitySolutionFlyoutInsightsThreatIntelligenceTitleLink')
      ).toHaveText('Threat intelligence');

      await test.step('Verify threat match values', async () => {
        await expect(
          page.testSubj.locator(
            'securitySolutionFlyoutInsightsThreatIntelligenceThreatMatchesButton'
          )
        ).toHaveText('0');
        await expect(
          page.testSubj.locator(
            'securitySolutionFlyoutInsightsThreatIntelligenceEnrichedWithThreatIntelligenceButton'
          )
        ).toHaveText('0');
      });

      await test.step('Navigate to left panel Threat Intelligence tab', async () => {
        await page.testSubj
          .locator('securitySolutionFlyoutInsightsThreatIntelligenceTitleLink')
          .click();

        const insightsTab = page.testSubj.locator('securitySolutionFlyoutInsightsTab');
        await expect(insightsTab).toHaveText('Insights');
        await expect(insightsTab).toHaveClass(/euiTab-isSelected/);

        const tiButton = page.testSubj.locator(
          'securitySolutionFlyoutInsightsTabThreatIntelligenceButton'
        );
        await expect(tiButton).toHaveText('Threat intelligence');
        await expect(tiButton).toHaveClass(/euiButtonGroupButton-isSelected/);
      });
    });

    test('should display prevalence section in insights', async ({ page }) => {
      await page.testSubj.locator('securitySolutionFlyoutAboutSectionHeader').click();
      await page.testSubj.locator('securitySolutionFlyoutInvestigationSectionHeader').click();
      await page.testSubj.locator('securitySolutionFlyoutInsightsHeader').click();

      await expect(
        page.testSubj.locator('securitySolutionFlyoutInsightsPrevalenceTitleLink')
      ).toHaveText('Prevalence');
      await expect(
        page.testSubj.locator('securitySolutionFlyoutInsightsPrevalenceContent')
      ).toHaveText('No prevalence data available.');

      await test.step('Navigate to left panel Prevalence tab', async () => {
        await page.testSubj.locator('securitySolutionFlyoutInsightsPrevalenceTitleLink').click();

        const insightsTab = page.testSubj.locator('securitySolutionFlyoutInsightsTab');
        await expect(insightsTab).toHaveText('Insights');
        await expect(insightsTab).toHaveClass(/euiTab-isSelected/);

        const prevalenceButton = page.testSubj.locator(
          'securitySolutionFlyoutInsightsTabPrevalenceButton'
        );
        await expect(prevalenceButton).toHaveText('Prevalence');
        await expect(prevalenceButton).toHaveClass(/euiButtonGroupButton-isSelected/);
      });
    });

    test('should display response section', async ({ page }) => {
      await page.testSubj.locator('securitySolutionFlyoutAboutSectionHeader').click();
      await page.testSubj.locator('securitySolutionFlyoutInvestigationSectionHeader').click();
      await page.testSubj.locator('securitySolutionFlyoutResponseSectionHeader').click();

      await expect(page.testSubj.locator('securitySolutionFlyoutResponseButton')).toHaveText(
        'Response'
      );

      await page.testSubj.locator('securitySolutionFlyoutResponseButton').click();

      const responseTab = page.testSubj.locator('securitySolutionFlyoutResponseTab');
      await expect(responseTab).toHaveText('Response');
      await expect(responseTab).toHaveClass(/euiTab-isSelected/);
    });
  }
);
