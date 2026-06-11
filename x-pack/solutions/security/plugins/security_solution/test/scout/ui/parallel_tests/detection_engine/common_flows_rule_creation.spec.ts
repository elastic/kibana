/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const RULE_NAME = 'Test Rule';
const RULE_DESCRIPTION = 'Test Rule Description';
const MAX_SIGNALS = '200';
const SETUP_GUIDE_TEXT = '# test setup markdown';
const LOOK_BACK_VALUE = '50000';
const LOOK_BACK_UNIT = 'h';
const TIMELINE_QUERY = 'host.name: *';

spaceTest.describe(
  'Common rule creation flows',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let timelineId: string;

    spaceTest.beforeAll(async ({ apiServices }) => {
      // Clean up any leftover rules from a previous failed run
      await apiServices.detectionRule.deleteAll();
      await apiServices.timeline.deleteAll();
      // Create a timeline to import its query in the Define step
      timelineId = await apiServices.timeline.createTimeline();
    });

    spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
      // Clean up everything created by this test
      await apiServices.detectionRule.deleteAll();
      await apiServices.timeline.deleteAll();
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'creates and enables a rule with all common fields',
      async ({ pageObjects, browserAuth }) => {
        await browserAuth.loginAsPlatformEngineer();
        const { createRulePage, ruleDetailsPage } = pageObjects;

        await spaceTest.step('navigate to rule creation page', async () => {
          await createRulePage.navigate();
        });

        await spaceTest.step('fill define section and continue', async () => {
          await createRulePage.importQueryFromTimeline(timelineId);
          await expect(createRulePage.customQueryInput).toHaveValue(TIMELINE_QUERY);
          await createRulePage.defineContinueButton.click();
          await expect(createRulePage.ruleNameInput).toBeVisible();
        });

        await spaceTest.step('fill about section and continue', async () => {
          await createRulePage.fillRuleName(RULE_NAME);
          await createRulePage.fillRuleDescription(RULE_DESCRIPTION);
          await createRulePage.expandAdvancedSettings();
          await createRulePage.fillMaxSignals(Number(MAX_SIGNALS));
          await createRulePage.fillSetupGuide(SETUP_GUIDE_TEXT);
          await createRulePage.aboutContinueButton.scrollIntoViewIfNeeded();
          await createRulePage.aboutContinueButton.click();
          await expect(createRulePage.scheduleContinueButton).toBeVisible();
        });

        await spaceTest.step('fill schedule and verify state persistence', async () => {
          await createRulePage.lookBackInterval.scrollIntoViewIfNeeded();
          await createRulePage.fillLookBack(LOOK_BACK_VALUE, LOOK_BACK_UNIT);
          await expect(createRulePage.lookBackInterval).toHaveValue(LOOK_BACK_VALUE);

          // Go back to define step and verify query is still there
          await createRulePage.defineEditButton.click();
          await expect(createRulePage.customQueryInput).toHaveValue(TIMELINE_QUERY);
          await createRulePage.defineContinueButton.click();
          await expect(createRulePage.ruleNameInput).toBeVisible();

          // Go back to about step and verify rule name is still there
          await expect(createRulePage.ruleNameInput).toBeVisible();
          await expect(createRulePage.ruleNameInput).toHaveValue(RULE_NAME);
          await createRulePage.aboutContinueButton.scrollIntoViewIfNeeded();
          await createRulePage.aboutContinueButton.click();
          await createRulePage.scheduleContinueButton.click();
          await expect(createRulePage.createAndEnableButton).toBeVisible();
        });

        await spaceTest.step('create rule and verify details page', async () => {
          await createRulePage.createAndEnable();

          await expect(ruleDetailsPage.ruleNameHeader).toContainText(RULE_NAME);
          await expect(ruleDetailsPage.maxSignalsDetail).toContainText(MAX_SIGNALS);

          await ruleDetailsPage.openSetupGuide();
          await expect(ruleDetailsPage.setupGuideContent).toContainText('test setup markdown');
        });
      }
    );
  }
);
