/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';
import { seedHostWithAlert, type SeededHostAlert } from '../../common/seed_endpoint_hosts';
import { PARALLEL_HOST_SEED_TIMEOUT_MS } from '../../common/get_file_spec_helpers';
import { openAlertFlyoutForRule, openAlertFlyoutFromTimeline } from '../fixtures/open_alert_flyout';

type SeededAlert = SeededHostAlert & { cleanup: () => Promise<void> };

const requireSeededAlert = (seeded: SeededAlert | undefined): SeededAlert => {
  if (!seeded) {
    throw new Error('Host alert was not seeded');
  }
  return seeded;
};

spaceTest.describe(
  'Response console from an alert',
  { tag: [...tags.stateful.classic, '@local-serverless-security_complete'] },
  () => {
    let seeded: SeededAlert | undefined;

    spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config }) => {
      spaceTest.setTimeout(PARALLEL_HOST_SEED_TIMEOUT_MS);
      // Serverless forces xpack.spaces.allowSolutionVisibility off, so the
      // solution property cannot be set. A security project is already that view.
      if (!config.serverless) {
        await scoutSpace.setSolutionView('security');
      }
      seeded = await seedHostWithAlert({
        esClient,
        kbnClient,
        spaceId: scoutSpace.id,
        config,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      // `siemV5.all` does not include response-action sub-features, so platform_engineer
      // never renders Respond. Same default role as the Cypress suite.
      await browserAuth.loginAsSecurityRole('endpoint_operations_analyst');
    });

    spaceTest.afterAll(async () => {
      await seeded?.cleanup();
    });

    spaceTest(
      'opens the console from the alert flyout and keeps its output when reopened from the endpoint list',
      async ({ page, pageObjects, scoutSpace }) => {
        const { ruleName, hostname } = requireSeededAlert(seeded);
        const { chrome, documentFlyout, endpointList, responseConsole } = pageObjects;

        await spaceTest.step('Respond in the alert flyout opens the console', async () => {
          await openAlertFlyoutForRule(page, pageObjects, ruleName);
          await documentFlyout.openTakeActionMenu();
          await expect(responseConsole.respondAction).toBeEnabled();
          await responseConsole.openFromRespondAction();
          await expect(responseConsole.overlay).toBeVisible();
        });

        await spaceTest.step('the help command shows its output', async () => {
          await responseConsole.enterCommand('help');
          await responseConsole.submitCommand();
          await expect(responseConsole.helpOutput).toBeVisible();
        });

        await spaceTest.step(
          'the endpoint list opens the same console with its output kept',
          async () => {
            await endpointList.openFromGlobalSearch(chrome, scoutSpace.id);
            await expect(endpointList.rowFor(hostname)).toBeVisible();
            await endpointList.openResponder(hostname);
            await expect(responseConsole.overlay).toBeVisible();
            await expect(responseConsole.helpOutput).toBeVisible();
          }
        );
      }
    );

    spaceTest(
      'opens the console from the alert flyout in Timeline',
      async ({ page, pageObjects }) => {
        const { ruleName } = requireSeededAlert(seeded);
        const { documentFlyout, responseConsole } = pageObjects;

        await spaceTest.step('open the alert flyout from Timeline', async () => {
          await openAlertFlyoutFromTimeline(page, pageObjects, ruleName);
        });

        await spaceTest.step('Respond opens the console', async () => {
          await documentFlyout.openTakeActionMenu();
          await expect(responseConsole.respondAction).toBeEnabled();
          await responseConsole.openFromRespondAction();
          await expect(responseConsole.overlay).toBeVisible();
        });
      }
    );
  }
);
