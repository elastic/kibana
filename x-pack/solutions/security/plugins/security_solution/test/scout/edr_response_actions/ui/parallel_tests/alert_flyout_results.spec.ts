/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';
import {
  seedAlertFlyoutResponseAction,
  type SeededAlertFlyoutResponseAction,
} from '../fixtures/seed_response_actions_history';

/**
 * Flyout v2 phrases the action as "is executing isolate command" / "executed
 * isolate command". The response-actions list still uses "isolate is pending"
 * / "isolate completed successfully", and the shared loader can also mark the
 * action failed. Any of these means the isolate result rendered.
 */
const ISOLATE_RESULT =
  /isolate is pending|isolate completed successfully|isolate failed|is executing isolate command|executed isolate command|failed to execute isolate command|tried to execute isolate command/;

const requireSeededAlert = (
  seeded: SeededAlertFlyoutResponseAction | undefined
): SeededAlertFlyoutResponseAction => {
  if (!seeded) {
    throw new Error('Alert flyout response action data was not seeded');
  }
  return seeded;
};

spaceTest.describe(
  'Alert flyout automated response results',
  {
    // Cypress was `@ess`, `@serverless`, and `@skipInServerlessMKI`.
    // `@local-serverless-security_complete` keeps simulated serverless and leaves
    // out Cloud serverless (MKI). Host indexing needs the system-indices user,
    // which cannot be provisioned on MKI.
    tag: [...tags.stateful.classic, '@local-serverless-security_complete'],
  },
  () => {
    let seeded: SeededAlertFlyoutResponseAction | undefined;

    spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config }) => {
      // Endpoint host indexing installs Fleet and waits on metadata transforms.
      spaceTest.setTimeout(600_000);
      await scoutSpace.setSolutionView('security');
      seeded = await seedAlertFlyoutResponseAction({
        esClient,
        kbnClient,
        spaceId: scoutSpace.id,
        config,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      // The alerts page requires manage on `.lists-*` and `.items-*`. soc_manager
      // does not have it, so the page stops on the privileges callout and the
      // alerts table never reaches its loaded state. platform_engineer has that
      // index access and actions-log read, which is what the response details need.
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterAll(async () => {
      await seeded?.cleanup();
    });

    spaceTest('shows the isolate action on the alert response details', async ({ pageObjects }) => {
      // The alerts page load wait is 60s, and the suite timeout is also 60s.
      spaceTest.setTimeout(120_000);
      const { alertId } = requireSeededAlert(seeded);
      const { alertFlyoutResponse } = pageObjects;

      await spaceTest.step('open the seeded alert', async () => {
        await alertFlyoutResponse.openAlert(alertId);
      });

      await spaceTest.step('open the response details', async () => {
        await alertFlyoutResponse.openResponseDetails();
      });

      await expect(alertFlyoutResponse.responseDetails).toContainText(ISOLATE_RESULT);
    });
  }
);
