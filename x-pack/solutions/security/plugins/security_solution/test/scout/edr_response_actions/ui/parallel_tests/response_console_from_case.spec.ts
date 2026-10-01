/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';
import {
  seedResponseConsoleFromCase,
  type SeededResponseConsoleCase,
} from '../fixtures/seed_response_console_from_case';

const requireSeededCase = (
  seeded: SeededResponseConsoleCase | undefined
): SeededResponseConsoleCase => {
  if (!seeded) {
    throw new Error('Response console case was not seeded');
  }
  return seeded;
};

spaceTest.describe(
  'Response console from a case',
  {
    // Cypress ran on ESS and local serverless (`@ess`, `@serverless`) and skipped
    // serverless MKI. Indexing the Fleet agent uses a system-indices client that
    // Cloud serverless cannot provision.
    tag: [...tags.stateful.classic, '@local-serverless-security_complete'],
  },
  () => {
    let seeded: SeededResponseConsoleCase | undefined;

    spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config, apiServices }) => {
      // Endpoint host indexing installs Fleet and waits on metadata transforms.
      spaceTest.setTimeout(600_000);
      await scoutSpace.setSolutionView('security');
      seeded = await seedResponseConsoleFromCase({
        esClient,
        kbnClient,
        spaceId: scoutSpace.id,
        config,
        cases: apiServices.cases,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterAll(async () => {
      await seeded?.cleanup();
    });

    spaceTest(
      'opens the console from the case alert and keeps the history date picker usable',
      async ({ page, pageObjects }) => {
        const { caseId, commentId } = requireSeededCase(seeded);
        const { documentFlyout, responseConsole } = pageObjects;

        await spaceTest.step('open the attached endpoint alert', async () => {
          await page.gotoApp(`security/cases/${caseId}`);
          await page.testSubj.locator('case-view-tabs').waitFor({ state: 'visible' });
          await page.testSubj.locator(`comment-action-show-alert-${commentId}`).click();
          await documentFlyout.waitForAlertFlyout();
        });

        await spaceTest.step('Respond is enabled and opens the console', async () => {
          await documentFlyout.openTakeActionMenu();
          const respond = page.testSubj.locator('endpointResponseActions-action-item');
          await expect(respond).toBeEnabled();
          await respond.click();
          await expect(responseConsole.overlay).toBeVisible();
        });

        await spaceTest.step('history date quick menu is usable above the console', async () => {
          await responseConsole.openActionLog();
          await responseConsole.selectActionLogLast7Days();
          await expect(responseConsole.dateQuickMenu).toBeHidden();
          await expect(responseConsole.actionLogDatesButton).toContainText('Last 7 days');
          await responseConsole.closeActionLog();
          await expect(page.testSubj.locator('userMenuButton')).toBeVisible();
        });

        await spaceTest.step('close the console', async () => {
          await responseConsole.close();
          await expect(responseConsole.overlay).toBeHidden();
        });
      }
    );
  }
);
